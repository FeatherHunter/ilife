/** #787 · 日程与计划·写侧的**三张回执页**（口径与页装配）：补计划回执、改计划回执、删计划回执。
 *
 *  为什么口径住这里、不住共用位：共用位不许出现任何一个能力的名字，而「这一天算不算补上了、
 *  改了几格、软删之后这一天还剩几件」全是**本域的口径**——摆好再交给页型函数与族级件。
 *
 *  **不重算别家口径**：事件自身的字段（时段／标题／分类／完成／同步标识）直接读库行（`fetch` 的能力门），
 *  一级分类映射调 `policy` 的 `l1Of`，时间解析调 `toMinutes`。本件只做「页上摆成什么样」。
 *
 *  三张页（老侧家族 → 这条写命令的哪一支）：
 *    · 补计划回执（老侧 f15「补日程回执」）← `op=ensure`：新事件回执 ＋ **幂等命中注记位**（同一天同一段
 *      起止已经有了＝这一步没新建，回执里的号还是原来那条）；批量那一支（`dates[]`）出逐天结果表；
 *    · 改计划回执（老侧 f14「改/删日程回执」）← `op=update`：**字段前后对照**（蓝调面板）＋ **飞书询问位**
 *      （这一趟远端侧做了什么、没做什么，如实报）；
 *    · 删计划回执（老侧 f14 同一家族）← `op=deactivate`：软删的对照（这一天在排的件数变了、这一条不再算），
 *      并写明原件还在库里。
 *
 *  **页上文案纪律**：一页里不出现命令键、库列名、参数名、票号；并列关系一律用版面表达（对照行／卡片格／
 *  表格列），不拿 `·`／`｜`／`~`／`、`／`；` 这些符号顶替设计——本票证据件里那条机器判据（分隔符门）量的
 *  就是这条。范围一律写「至」，不用波浪号。
 *
 *  #891 补的**页内定位**（不动件序列，只给已有的段名加锚点与页首目录）：判据（小节数 ≥ 3 出目录）
 *  与装配的唯一一处定义地在 `shared/pageNav.ts` 的 `SECTION_TOC_MIN`。
 *  **这一页型里被判为短页的是「批量补计划回执」**：它恒 2 小节（`这一趟的结果`／`复制与留档`）
 *  ⇒ `tocEl` 保持 0、D5 那条腿照旧扣 4；另外三张回执恒 ≥4 小节（补计划回执 4／5 小节按有没有命中注记位）。
 */
import {
  renderCaliberLine, renderConclusionBar, renderDataTable, renderDisclosure,
  renderFeedbackBlock, renderKpiGrid, type ChangeRowInput, type DataTableRow,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import type { PlanEvent, ScheduleDb } from '../fetch/db.js';
import { listPlanEvents } from '../fetch/index.js';
import { fmtDur, fmtDurShort, completionLabelOf, l1Of, toMinutes, LEVEL1_WHITELIST } from '../policy/index.js';
import { scheduleCopyArea } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { pageSections } from '../shared/pageNav.js';
import { hourCellsOf, renderHourBand } from '../shared/pageParts.js';
import { remoteLabelOf, planCopyArea, type RemoteState } from './receipt.js';
import { planPartsCss, renderChangePanel } from './planParts.js';
import { m } from '../entries/index.js';

/** 域词（页眉那一行）。 */
/** 页眉（品牌＋域）。#1197：改成函数——`m()` 只在渲染期取词，模块级常量的初值会定死语言。 */
const eyebrowOf = (): string => m('skill-schedule.plan-receiptDocs.c001');
/** 一级分类的权威顺序（色带配色与图例都照它），定义只此一处：`policy` 的白名单。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];

/** 回执页上的字段中文名（库列名与命令参数名都不上屏；一处定义）。
 *  #1197：由模块级常量表改成函数——常量初值在模块加载期就定死语言了，取词要落在页函数里（§4.8）。 */
function fieldLabels(): Readonly<Record<string, string>> {
  return {
  date: m('skill-schedule.plan-receiptDocs.c002'),
  time_start: m('skill-schedule.plan-receiptDocs.c003'),
  time_end: m('skill-schedule.plan-receiptDocs.c004'),
  title: m('skill-schedule.plan-receiptDocs.c005'),
  notes: m('skill-schedule.plan-receiptDocs.c006'),
  category: m('skill-schedule.plan-receiptDocs.c007'),
  completion: m('skill-schedule.plan-receiptDocs.c008'),
  completion_note: m('skill-schedule.plan-receiptDocs.c009'),
  };
}

const span = (start: string, end: string): string => m('skill-schedule.plan-receiptDocs.c010', { p0: String(start), p1: String(end) });
const empty = (v: unknown): string => (v === null || v === undefined || v === '' ? '—' : String(v));
/** #894 · 完成状态上屏写法：库里存的是半角口径，页上走全角映射（取值不动）。 */
const completionText = (v: unknown): string =>
  (v === null || v === undefined || v === '' ? '—' : completionLabelOf(String(v)));

/** 事件行在页上的分类写法：没标分类的那一条写「未分类」（不印空串）。 */
const categoryOf = (e: PlanEvent): string => (e.category === null || e.category === '' ? m('skill-schedule.plan-receiptDocs.c011') : e.category);

function cellsOf(events: readonly PlanEvent[]): ReturnType<typeof hourCellsOf> {
  return hourCellsOf(events.map((e) => ({
    start: toMinutes(e.time_start),
    end: toMinutes(e.time_end),
    key: l1Of(e.category ?? ''),
  })));
}

/* ─────────────────────────── ① 补计划回执（老侧 f15） ─────────────────────────── */

export interface EnsureReceipt {
  readonly id: number;
  readonly date: string;
  /** 本地这一趟是新建还是命中已有的那一条（幂等）。 */
  readonly created: boolean;
  readonly remote: RemoteState;
}

/** 「补计划回执」整页：新事件回执 ＋（命中时）幂等命中注记位 ＋ 这一天现在的排布。 */
export function ensureReceiptPage(handle: ScheduleDb, r: EnsureReceipt): string {
  const event = listPlanEvents(handle, r.date, true).find((e) => e.id === r.id);
  const day = listPlanEvents(handle, r.date);
  const minutes = event === undefined ? 0 : toMinutes(event.time_end) - toMinutes(event.time_start);
  const sameCategory = event === undefined ? 0 : day.filter((e) => e.category === event.category).length;
  const hit = renderFeedbackBlock({
    title: m('skill-schedule.plan-receiptDocs.c012'),
    toast: {
      icon: 'info',
      msg: m('skill-schedule.plan-receiptDocs.c013'),
    },
    staticNotice: true,
  });
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-receiptDocs.c014'),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-receiptDocs.c015'),
    subtitle: event === undefined
      ? m('skill-schedule.plan-receiptDocs.c016', { p0: String(r.date) })
      : m('skill-schedule.plan-receiptDocs.c017', {
        p0: String(r.date),
        p1: String(span(event.time_start, event.time_end)),
        p2: String(event.title),
      }),
  };
  const current: DataTableRow[] = event === undefined ? [] : [
    { k: m('skill-schedule.plan-receiptDocs.c018'), v: String(event.id) },
    { k: m('skill-schedule.plan-receiptDocs.c019'), v: event.date },
    { k: m('skill-schedule.plan-receiptDocs.c020'), v: span(event.time_start, event.time_end) },
    { k: m('skill-schedule.plan-receiptDocs.c021'), v: fmtDur(minutes) },
    { k: m('skill-schedule.plan-receiptDocs.c022'), v: event.title },
    { k: m('skill-schedule.plan-receiptDocs.c023'), v: categoryOf(event) },
    { k: m('skill-schedule.plan-receiptDocs.c024'), v: empty(event.notes) },
    { k: m('skill-schedule.plan-receiptDocs.c025'), v: completionText(event.completion) },
  ];
  // §4.7 · 结论那两支各含文案，先算成局部变量；链里只拼字面量＋变量。
  const spanText = event === undefined ? m('skill-schedule.plan-receiptDocs.c026') : span(event.time_start, event.time_end);
  const createdNote = r.created ? m('skill-schedule.plan-receiptDocs.c027') : m('skill-schedule.plan-receiptDocs.c028');
  const createdConclusion = m('skill-schedule.plan-receiptDocs.c029', {
    p0: String(r.date),
    p1: String(spanText),
    p2: String(day.length),
  });
  const hitConclusion = m('skill-schedule.plan-receiptDocs.c030', { p0: String(r.date), p1: String(day.length) });
  const { toc, body } = pageSections([
    { navText: r.created ? '' : m('skill-schedule.plan-receiptDocs.c031'), html: r.created ? '' : hit },
    { html: renderConclusionBar(r.created ? createdConclusion : hitConclusion) },
    { navText: m('skill-schedule.plan-receiptDocs.c032'), html: renderKpiGrid([
      { label: m('skill-schedule.plan-receiptDocs.c033'), value: String(r.id), detail: r.date },
      {
        label: m('skill-schedule.plan-receiptDocs.c034'), value: r.created ? m('skill-schedule.plan-receiptDocs.c035') : m('skill-schedule.plan-receiptDocs.c036'),
        detail: r.created ? m('skill-schedule.plan-receiptDocs.c037') : m('skill-schedule.plan-receiptDocs.c038'),
      },
      { label: m('skill-schedule.plan-receiptDocs.c039'), value: event === undefined ? '—' : fmtDurShort(minutes), detail: event === undefined ? '—' : span(event.time_start, event.time_end) },
      { label: m('skill-schedule.plan-receiptDocs.c040'), value: m('skill-schedule.plan-receiptDocs.c041', { p0: String(String(day.length)) }), detail: m('skill-schedule.plan-receiptDocs.c042', { p0: String(String(sameCategory)) }) },
    ], { title: m('skill-schedule.plan-receiptDocs.c043') }) },
    { navText: m('skill-schedule.plan-receiptDocs.c044'), html: renderChangePanel({ title: m('skill-schedule.plan-receiptDocs.c045'), rows: [
      { label: m('skill-schedule.plan-receiptDocs.c046'), before: r.created ? m('skill-schedule.plan-receiptDocs.c047') : m('skill-schedule.plan-receiptDocs.c048'), after: m('skill-schedule.plan-receiptDocs.c049') },
      { label: m('skill-schedule.plan-receiptDocs.c050'), before: r.created ? '—' : String(r.id), after: String(r.id), arrow: false },
    ] }) },
    { html: renderFactStrip({
      items: [
        { label: m('skill-schedule.plan-receiptDocs.c051'), value: remoteLabelOf(r.remote) },
        { label: m('skill-schedule.plan-receiptDocs.c052'), value: m('skill-schedule.plan-receiptDocs.c053', { p0: String(String(day.length)) }) },
        { label: m('skill-schedule.plan-receiptDocs.c054'), value: m('skill-schedule.plan-receiptDocs.c055', { p0: String(String(sameCategory)) }) },
        { label: m('skill-schedule.plan-receiptDocs.c056'), value: event === undefined ? '—' : completionText(event.completion) },
      ],
    }) },
    { navText: m('skill-schedule.plan-receiptDocs.c057'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-receiptDocs.c058'),
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-receiptDocs.c059', {
          p0: String(r.date),
          p1: String(String(r.id)),
          p2: String(event === undefined ? '—' : span(event.time_start, event.time_end)),
          p3: String(createdNote),
          p4: String(remoteLabelOf(r.remote)),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"ensure","date":"' + r.date + '"}',
        source: m('skill-schedule.plan-receiptDocs.c060', { p0: String(r.date), p1: String(String(day.length)) }),
      }),
    }) },
    { html: renderDisclosure({
      title: m('skill-schedule.plan-receiptDocs.c061'),
      contentHtml: renderDataTable({
        caption: m('skill-schedule.plan-receiptDocs.c062'),
        columns: [{ key: 'k', label: m('skill-schedule.plan-receiptDocs.c063') }, { key: 'v', label: m('skill-schedule.plan-receiptDocs.c064') }],
        rows: current,
        emptyText: m('skill-schedule.plan-receiptDocs.c065'),
      }),
    }) },
    // 段名是「<日期> 这一天现在的排布」；目录项与它逐字同源（同一句拼接写两处）。
    { navText: m('skill-schedule.plan-receiptDocs.c066', { p0: String(r.date) }), html: event === undefined ? '' : renderHourBand(cellsOf(day), {
      order: L1_ORDER, title: m('skill-schedule.plan-receiptDocs.c067', { p0: String(r.date) }), height: 120,
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
}

/** 批量补计划（`dates[]`）逐天一份结果：本地新建还是命中、远端侧成没成。 */
export interface EnsureBatchDay {
  readonly date: string;
  readonly id: number;
  readonly created: boolean;
  readonly remote: RemoteState;
  readonly achieved: boolean;
}

/** 「批量补计划回执」整页：逐天结果表 ＋ 汇总（复用单天那张页的口径，不另算一遍）。 */
export function ensureBatchReceiptPage(handle: ScheduleDb, days: readonly EnsureBatchDay[]): string {
  const created = days.filter((d) => d.created).length;
  const found = days.length - created;
  const failed = days.filter((d) => !d.achieved).length;
  const sorted = [...days].map((d) => d.date).sort();
  const tables: DataTableRow[] = days.map((d) => {
    const event = listPlanEvents(handle, d.date, true).find((e) => e.id === d.id);
    return {
      date: d.date,
      time: event === undefined ? '—' : span(event.time_start, event.time_end),
      title: event === undefined ? '—' : event.title,
      result: d.created ? m('skill-schedule.plan-receiptDocs.c068') : m('skill-schedule.plan-receiptDocs.c069'),
      remote: remoteLabelOf(d.remote),
    };
  });
  const daysText = sorted.length === 0 ? m('skill-schedule.plan-receiptDocs.c070') : m('skill-schedule.plan-receiptDocs.c071', { p0: String(sorted[0]), p1: String(sorted[sorted.length - 1]) });
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-receiptDocs.c072'),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-receiptDocs.c073'),
    subtitle: m('skill-schedule.plan-receiptDocs.c074', { p0: String(daysText), p1: String(days.length) }),
  };
  // §4.7 · 逐天结果那串里嵌着条件，先抽局部变量。
  const dayLines = days.map((d) => {
    const createdNote = d.created ? m('skill-schedule.plan-receiptDocs.c075') : m('skill-schedule.plan-receiptDocs.c076');
    return d.date + ' ' + createdNote + ' ' + remoteLabelOf(d.remote);
  });
  const { toc, body } = pageSections([
    { html: renderConclusionBar(failed === 0
      ? m('skill-schedule.plan-receiptDocs.c077', {
        p0: String(days.length),
        p1: String(created),
        p2: String(found),
      })
      : m('skill-schedule.plan-receiptDocs.c078', { p0: String(days.length), p1: String(failed) })) },
    { navText: m('skill-schedule.plan-receiptDocs.c079'), html: renderKpiGrid([
      { label: m('skill-schedule.plan-receiptDocs.c080'), value: m('skill-schedule.plan-receiptDocs.c081', { p0: String(String(days.length)) }), detail: m('skill-schedule.plan-receiptDocs.c082') },
      { label: m('skill-schedule.plan-receiptDocs.c083'), value: m('skill-schedule.plan-receiptDocs.c084', { p0: String(String(created)) }), detail: m('skill-schedule.plan-receiptDocs.c085') },
      { label: m('skill-schedule.plan-receiptDocs.c086'), value: m('skill-schedule.plan-receiptDocs.c087', { p0: String(String(found)) }), detail: m('skill-schedule.plan-receiptDocs.c088') },
      { label: m('skill-schedule.plan-receiptDocs.c089'), value: m('skill-schedule.plan-receiptDocs.c090', { p0: String(String(failed)) }), detail: failed === 0 ? m('skill-schedule.plan-receiptDocs.c091') : m('skill-schedule.plan-receiptDocs.c092') },
    ], { title: m('skill-schedule.plan-receiptDocs.c093') }) },
    { html: renderDataTable({
      caption: m('skill-schedule.plan-receiptDocs.c094'),
      columns: [
        { key: 'date', label: m('skill-schedule.plan-receiptDocs.c095') },
        { key: 'time', label: m('skill-schedule.plan-receiptDocs.c096') },
        { key: 'title', label: m('skill-schedule.plan-receiptDocs.c097') },
        { key: 'result', label: m('skill-schedule.plan-receiptDocs.c098') },
        { key: 'remote', label: m('skill-schedule.plan-receiptDocs.c099') },
      ],
      rows: tables,
      emptyText: m('skill-schedule.plan-receiptDocs.c100'),
    }) },
    { html: renderCaliberLine(m('skill-schedule.plan-receiptDocs.c101')) },
    { navText: m('skill-schedule.plan-receiptDocs.c102'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-receiptDocs.c103'),
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-receiptDocs.c104', {
          p0: String(String(days.length)),
          p1: String(dayLines.join('，')),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"ensure","dates":['
          + days.map((d) => '"' + d.date + '"').join(',') + ']}',
        source: m('skill-schedule.plan-receiptDocs.c105', { p0: String(String(days.length)) }),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
}

/* ─────────────────────────── ② 改计划回执（老侧 f14） ─────────────────────────── */

function fieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'completion') return completionLabelOf(String(value));
  return String(value);
}

/** 「改计划回执」整页：字段前后对照 ＋ 飞书询问位 ＋ 这条现在长什么样。 */
export function updateReceiptPage(
  handle: ScheduleDb, before: PlanEvent, after: PlanEvent, patchKeys: readonly string[], remote: RemoteState,
): string {
  const labels = fieldLabels();
  const rows: ChangeRowInput[] = patchKeys
    .filter((key) => labels[key] !== undefined)
    .map((key) => ({
      label: labels[key],
      before: fieldValue(key, (before as unknown as Record<string, unknown>)[key]),
      after: fieldValue(key, (after as unknown as Record<string, unknown>)[key]),
    }));
  const moved = before.time_start !== after.time_start || before.time_end !== after.time_end;
  const day = listPlanEvents(handle, after.date);
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-receiptDocs.c106'),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-receiptDocs.c107'),
    subtitle: m('skill-schedule.plan-receiptDocs.c108', {
      p0: String(after.date),
      p1: String(span(before.time_start, before.time_end)),
      p2: String(span(after.time_start, after.time_end)),
    }),
  };
  const { toc, body } = pageSections([
    { html: renderConclusionBar(moved
      ? m('skill-schedule.plan-receiptDocs.c109', { p0: String(span(after.time_start, after.time_end)) })
      : m('skill-schedule.plan-receiptDocs.c110')) },
    { navText: m('skill-schedule.plan-receiptDocs.c111'), html: renderKpiGrid([
      { label: m('skill-schedule.plan-receiptDocs.c112'), value: String(after.id), detail: after.date },
      { label: m('skill-schedule.plan-receiptDocs.c113'), value: fmtDurShort(toMinutes(after.time_end) - toMinutes(after.time_start)), detail: span(after.time_start, after.time_end) },
      { label: m('skill-schedule.plan-receiptDocs.c114'), value: m('skill-schedule.plan-receiptDocs.c115', { p0: String(String(rows.length)) }), detail: moved ? m('skill-schedule.plan-receiptDocs.c116') : m('skill-schedule.plan-receiptDocs.c117') },
      { label: m('skill-schedule.plan-receiptDocs.c118'), value: m('skill-schedule.plan-receiptDocs.c119', { p0: String(String(day.length)) }), detail: m('skill-schedule.plan-receiptDocs.c120') },
    ], { title: m('skill-schedule.plan-receiptDocs.c121') }) },
    { navText: m('skill-schedule.plan-receiptDocs.c122'), html: renderChangePanel({ title: m('skill-schedule.plan-receiptDocs.c123'), rows }) },
    { navText: m('skill-schedule.plan-receiptDocs.c124'), html: moved
      ? renderFeedbackBlock({
        title: m('skill-schedule.plan-receiptDocs.c125'),
        toast: {
          icon: 'warn',
          msg: m('skill-schedule.plan-receiptDocs.c126'),
        },
        staticNotice: true,
      })
      : '' },
    { html: renderFactStrip({
      items: [
        { label: m('skill-schedule.plan-receiptDocs.c127'), value: remoteLabelOf(remote) },
        { label: m('skill-schedule.plan-receiptDocs.c128'), value: after.title },
        { label: m('skill-schedule.plan-receiptDocs.c129'), value: categoryOf(after) },
        { label: m('skill-schedule.plan-receiptDocs.c130'), value: completionText(after.completion) },
      ],
    }) },
    { navText: m('skill-schedule.plan-receiptDocs.c131'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-receiptDocs.c132'),
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-receiptDocs.c133', {
          p0: String(after.date),
          p1: String(String(after.id)),
          p2: String(String(rows.length)),
          p3: String(rows.map((r) => r.label).join('，')),
          p4: String(span(after.time_start, after.time_end)),
          p5: String(remoteLabelOf(remote)),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"update","id":' + String(after.id) + '}',
        source: m('skill-schedule.plan-receiptDocs.c134', { p0: String(after.date), p1: String(String(day.length)) }),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
}

/* ─────────────────────────── ③ 删计划回执（老侧 f14 同一家族） ─────────────────────────── */

/** 「删计划回执」整页：软删的对照 ＋ 飞书询问位 ＋ 这一次删掉的是哪一条。 */
export function deactivateReceiptPage(handle: ScheduleDb, before: PlanEvent, remote: RemoteState): string {
  const day = listPlanEvents(handle, before.date);
  const minutes = toMinutes(before.time_end) - toMinutes(before.time_start);
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-receiptDocs.c135'),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-receiptDocs.c136'),
    subtitle: m('skill-schedule.plan-receiptDocs.c137', {
      p0: String(before.date),
      p1: String(span(before.time_start, before.time_end)),
      p2: String(before.title),
    }),
  };
  const { toc, body } = pageSections([
    { html: renderConclusionBar(m('skill-schedule.plan-receiptDocs.c138', { p0: String(before.date), p1: String(day.length) })) },
    { navText: m('skill-schedule.plan-receiptDocs.c139'), html: renderKpiGrid([
      { label: m('skill-schedule.plan-receiptDocs.c140'), value: String(before.id), detail: before.date },
      { label: m('skill-schedule.plan-receiptDocs.c141'), value: fmtDurShort(minutes), detail: span(before.time_start, before.time_end) },
      { label: m('skill-schedule.plan-receiptDocs.c142'), value: m('skill-schedule.plan-receiptDocs.c143', { p0: String(String(day.length)) }), detail: m('skill-schedule.plan-receiptDocs.c144') },
      { label: m('skill-schedule.plan-receiptDocs.c145'), value: m('skill-schedule.plan-receiptDocs.c146'), detail: m('skill-schedule.plan-receiptDocs.c147') },
    ], { title: m('skill-schedule.plan-receiptDocs.c148') }) },
    { navText: m('skill-schedule.plan-receiptDocs.c149'), html: renderChangePanel({ title: m('skill-schedule.plan-receiptDocs.c150'), rows: [
      { label: m('skill-schedule.plan-receiptDocs.c151'), before: m('skill-schedule.plan-receiptDocs.c152'), after: m('skill-schedule.plan-receiptDocs.c153') },
      { label: m('skill-schedule.plan-receiptDocs.c154'), before: m('skill-schedule.plan-receiptDocs.c155', { p0: String(String(day.length + 1)) }), after: m('skill-schedule.plan-receiptDocs.c156', { p0: String(String(day.length)) }) },
      { label: m('skill-schedule.plan-receiptDocs.c157'), before: before.feishu_event_id === null ? m('skill-schedule.plan-receiptDocs.c158') : m('skill-schedule.plan-receiptDocs.c159'), after: before.feishu_event_id === null ? m('skill-schedule.plan-receiptDocs.c160') : m('skill-schedule.plan-receiptDocs.c161') },
    ] }) },
    { navText: m('skill-schedule.plan-receiptDocs.c162'), html: renderFeedbackBlock({
      title: m('skill-schedule.plan-receiptDocs.c163'),
      toast: {
        icon: 'info',
        msg: m('skill-schedule.plan-receiptDocs.c164'),
      },
      staticNotice: true,
    }) },
    { html: renderFactStrip({
      items: [
        { label: m('skill-schedule.plan-receiptDocs.c165'), value: remoteLabelOf(remote) },
        { label: m('skill-schedule.plan-receiptDocs.c166'), value: before.title },
        { label: m('skill-schedule.plan-receiptDocs.c167'), value: categoryOf(before) },
        { label: m('skill-schedule.plan-receiptDocs.c168'), value: completionText(before.completion) },
      ],
    }) },
    { html: renderCaliberLine(m('skill-schedule.plan-receiptDocs.c169')) },
    { navText: m('skill-schedule.plan-receiptDocs.c170'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-receiptDocs.c171'),
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-receiptDocs.c172', {
          p0: String(before.date),
          p1: String(String(before.id)),
          p2: String(span(before.time_start, before.time_end)),
          p3: String(String(day.length)),
          p4: String(remoteLabelOf(remote)),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"deactivate","id":' + String(before.id) + '}',
        source: m('skill-schedule.plan-receiptDocs.c173', { p0: String(before.date), p1: String(String(day.length)) }),
      }),
    }) },
    // 段名是「<日期> 这一天现在的排布」；目录项与它逐字同源。
    { navText: m('skill-schedule.plan-receiptDocs.c174', { p0: String(before.date) }), html: renderHourBand(cellsOf(day), { order: L1_ORDER, title: m('skill-schedule.plan-receiptDocs.c175', { p0: String(before.date) }), height: 120 }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
}
