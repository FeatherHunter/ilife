/** #787 · 「商量计划」的**两张页**（口径与页装配）：过程型预览（f12）与制定次日计划结果（f17）。
 *
 *  为什么两张页分开（照地图裁决）：预览**不写库**，结果页写完之后才有——「先出候选、确认后才写库」，
 *  两张各自能独立跑（`op=preview` 与 `op=upsert`）。
 *
 *  口径住这里（共用位不许出现任何一个能力的名字）：
 *    · **空隙**＝候选之间没排上的连续时段——与「查日程」的空档同一条规则，函数只此一处（`planDocs`）；
 *    · **重叠**＝候选段与这一天原有事件在时间上搭着边（不要求整段包住）；
 *    · **历史贴**＝拿这一天往前 7 天的**作息记录**按整点归类，取该事件覆盖时段里出现最多的那个分类做主档
 *      （老侧 `plan_scenarios.py` 的 `build_history_habits` 与 `fit_events`，默认窗口 7 天）；
 *      候选那条的一级分类……**不折算**，就按库里那一串分类名比（老侧同口径）。
 *
 *  **页上文案纪律**：不出现命令键、库列名、参数名、票号；并列关系用表格列与对照行表达，不拿
 *  `·`／`｜`／`~`／`、`／`；` 顶替设计。范围一律写「至」。
 */
import {
  renderCaliberLine, renderConclusionBar, renderDataTable, renderDisclosure,
  renderFeedbackBlock, renderKpiGrid, renderListRows, renderPreBlock,
  type DataTableRow, type ListRowInput,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import type { PlanEvent, ScheduleDb, ScheduleRecord } from '../fetch/db.js';
import { listPlanEvents, listRecordsRange } from '../fetch/index.js';
import {
  LEVEL1_WHITELIST, fmtDur, fmtDurShort, l1Of, type PlanEventInput,
} from '../policy/index.js';
import { scheduleCopyArea } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { pageSections } from '../shared/pageNav.js';
import { hourCellsOf, renderHourBand } from '../shared/pageParts.js';
import { clockOf, gapsOf, minutesOfDayEnd } from './planDocs.js';
import { shiftDay } from './iso.js';
import { remoteLabelOf, planCopyArea, type RemoteState } from './receipt.js';
import { planPartsCss } from './planParts.js';
import { m } from '../entries/index.js';

/** 页眉（品牌＋域）。#1197：改成函数——`m()` 只在渲染期取词，模块级常量的初值会定死语言。 */
const eyebrowOf = (): string => m('skill-schedule.plan-discussDocs.c001');
/** 一级分类的权威顺序（色带配色与图例都照它），定义只此一处：`policy` 的白名单。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];
/** 历史窗口（天）：老侧 `plan_scenarios.DEFAULT_HISTORY_DAYS`。 */
const HISTORY_DAYS = 7;
const HOURS_PER_DAY = 24;

const span = (start: string, end: string): string => m('skill-schedule.plan-discussDocs.c002', { p0: String(start), p1: String(end) });
const categoryOf = (c: string | null | undefined): string => (c === null || c === undefined || c === '' ? m('skill-schedule.plan-discussDocs.c003') : c);
/** 钟点 → 分钟（**这一天末尾那一格按 24:00 算**，与空档同一条口径）：定义在 `planDocs`，本件只引用。 */
const minutesOf = minutesOfDayEnd;

function cellsOf(events: readonly { readonly time_start: string; readonly time_end: string; category?: string | null }[]) {
  return hourCellsOf(events.map((e) => ({
    start: minutesOf(e.time_start),
    end: minutesOf(e.time_end),
    key: l1Of(e.category ?? ''),
  })));
}

/** 这一段覆盖到哪几个整点（末段 24:00 收在 23 点）。 */
function hoursOf(start: string, end: string): number[] {
  const from = Math.floor(minutesOf(start) / 60);
  const to = Math.ceil(minutesOf(end) / 60);
  const out: number[] = [];
  for (let h = from; h < to && h < HOURS_PER_DAY; h += 1) out.push(h);
  return out;
}

/** 历史作息按整点归类：小时 → 分类 → 出现次数（老侧 `build_history_habits` 同口径）。 */
function habitsOf(records: readonly ScheduleRecord[]): Map<number, Map<string, number>> {
  const out = new Map<number, Map<string, number>>();
  for (const r of records) {
    const name = categoryOf(r.category);
    for (const h of hoursOf(r.time_start, r.time_end)) {
      const bucket = out.get(h) ?? new Map<string, number>();
      bucket.set(name, (bucket.get(name) ?? 0) + 1);
      out.set(h, bucket);
    }
  }
  return out;
}

/** 某几个整点里出现最多的那个分类（次数并列时取字典序在前的那个，读数才可复现）。 */
function dominantOf(
  habits: ReadonlyMap<number, ReadonlyMap<string, number>>, hours: readonly number[],
): { category: string; count: number } | null {
  const total = new Map<string, number>();
  for (const h of hours) {
    for (const [name, n] of habits.get(h) ?? []) total.set(name, (total.get(name) ?? 0) + n);
  }
  let best: { category: string; count: number } | null = null;
  for (const [category, count] of [...total.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (best === null || count > best.count) best = { category, count };
  }
  return best;
}

type Fit = 'match' | 'drift' | 'none';

/** 一条候选与历史的贴合：贴合／偏离／无参考 ＋ 一句人话提示（老侧 `fit_events` 的三档）。 */
function fitOf(
  category: string | null | undefined, habits: ReadonlyMap<number, ReadonlyMap<string, number>>,
  start: string, end: string,
): { readonly fit: Fit; readonly hint: string } {
  const top = dominantOf(habits, hoursOf(start, end));
  if (top === null) return { fit: 'none', hint: m('skill-schedule.plan-discussDocs.c004') };
  const mine = categoryOf(category);
  if (category === null || category === undefined || category === '') {
    return { fit: 'none', hint: m('skill-schedule.plan-discussDocs.c005', { p0: String(top.category) }) };
  }
  if (mine === top.category) {
    return { fit: 'match', hint: m('skill-schedule.plan-discussDocs.c006', { p0: String(top.category) }) };
  }
  return {
    fit: 'drift',
    hint: m('skill-schedule.plan-discussDocs.c007', {
      p0: String(top.category),
      p1: String(String(top.count)),
      p2: String(mine),
    }),
  };
}

/** 一条候选与这一条原有事件的重叠（搭着边即算，不要求整段包住）。 */
interface Overlap {
  readonly candidate: string;
  readonly locked: string;
  readonly overlap: string;
  readonly minutes: number;
}

function overlapsOf(
  candidates: readonly PlanEventInput[], locked: readonly PlanEvent[],
): Overlap[] {
  const out: Overlap[] = [];
  for (const c of candidates) {
    for (const l of locked) {
      const lo = Math.max(minutesOf(c.time_start), minutesOf(l.time_start));
      const hi = Math.min(minutesOf(c.time_end), minutesOf(l.time_end));
      if (hi > lo) {
        out.push({
          candidate: c.title + '（' + span(c.time_start, c.time_end) + '）',
          locked: l.title + '（' + span(l.time_start, l.time_end) + '）',
          overlap: span(clockOf(lo), clockOf(hi)),
          minutes: hi - lo,
        });
      }
    }
  }
  return out;
}

/* ─────────────────────── ① 商量计划预览（老侧 f12，过程型） ─────────────────────── */

/** 「商量计划预览」整页：候选事件表 ＋ 锁定事件区 ＋ 空隙提示。**这一页不写库**。 */
export function previewPage(handle: ScheduleDb, date: string, candidates: readonly PlanEventInput[]): string {
  const locked = listPlanEvents(handle, date);
  const gaps = gapsOf(candidates);
  const overlaps = overlapsOf(candidates, locked);
  const covered = candidates.reduce((sum, e) => sum + (minutesOf(e.time_end) - minutesOf(e.time_start)), 0);
  const rows: DataTableRow[] = candidates.map((e) => ({
    time: span(e.time_start, e.time_end),
    title: e.title,
    category: categoryOf(e.category),
    notes: e.notes === undefined || e.notes === null || e.notes === '' ? '—' : e.notes,
  }));  const lockedRows: ListRowInput[] = locked.map((e) => ({
    left: span(e.time_start, e.time_end),
    main: e.title,
    right: categoryOf(e.category),
  }));
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-discussDocs.c008'),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-discussDocs.c009'),
    subtitle: m('skill-schedule.plan-discussDocs.c010', { p0: String(String(candidates.length)), p1: String(date) }),
  };
  const { toc, body } = pageSections([
    { html: renderConclusionBar(m('skill-schedule.plan-discussDocs.c011', {
      p0: String(String(candidates.length)),
      p1: String(date),
      p2: String(fmtDur(covered)),
      p3: String(String(locked.length)),
      p4: String(String(overlaps.length)),
    })) },
    { navText: m('skill-schedule.plan-discussDocs.c012'), html: renderKpiGrid([
      { label: m('skill-schedule.plan-discussDocs.c013'), value: m('skill-schedule.plan-discussDocs.c014', { p0: String(String(candidates.length)) }), detail: m('skill-schedule.plan-discussDocs.c015') },
      {
        label: m('skill-schedule.plan-discussDocs.c016'), value: fmtDur(covered),
        detail: covered >= HOURS_PER_DAY * 60 ? m('skill-schedule.plan-discussDocs.c017') : m('skill-schedule.plan-discussDocs.c018'),
        bar: { pct: Math.min(100, Math.round((covered / (HOURS_PER_DAY * 60)) * 100)) },
      },
      { label: m('skill-schedule.plan-discussDocs.c019'), value: m('skill-schedule.plan-discussDocs.c020', { p0: String(String(overlaps.length)) }), detail: overlaps.length === 0 ? m('skill-schedule.plan-discussDocs.c021') : m('skill-schedule.plan-discussDocs.c022') },
      { label: m('skill-schedule.plan-discussDocs.c023'), value: m('skill-schedule.plan-discussDocs.c024', { p0: String(String(locked.length)) }), detail: m('skill-schedule.plan-discussDocs.c025') },
    ], { title: m('skill-schedule.plan-discussDocs.c026') }) },
    // 段名是「候选的 24 小时」；目录项逐字用它。
    { navText: m('skill-schedule.plan-discussDocs.c027'), html: renderHourBand(cellsOf(candidates), { order: L1_ORDER, title: m('skill-schedule.plan-discussDocs.c028'), height: 120 }) },
    { html: renderDataTable({
      caption: m('skill-schedule.plan-discussDocs.c029'),
      columns: [
        { key: 'time', label: m('skill-schedule.plan-discussDocs.c030') },
        { key: 'title', label: m('skill-schedule.plan-discussDocs.c031') },
        { key: 'category', label: m('skill-schedule.plan-discussDocs.c032') },
        { key: 'notes', label: m('skill-schedule.plan-discussDocs.c033') },
      ],
      rows,
      emptyText: m('skill-schedule.plan-discussDocs.c034'),
    }) },
    { html: renderCaliberLine(m('skill-schedule.plan-discussDocs.c035')) },
    { html: renderDisclosure({
      title: m('skill-schedule.plan-discussDocs.c036'),
      contentHtml: (locked.length === 0
        ? '<p class="sch-pl-note">' + m('skill-schedule.plan-discussDocs.c106') + '</p>'
        : '<p class="sch-pl-note">' + m('skill-schedule.plan-discussDocs.c107') + '</p>')
        + renderListRows({ items: lockedRows, emptyText: m('skill-schedule.plan-discussDocs.c037') }),
    }) },
    { html: renderDisclosure({
      title: m('skill-schedule.plan-discussDocs.c038'),
      contentHtml: renderListRows({
        items: gaps.map((g) => ({ left: span(clockOf(g.start), clockOf(g.end)), main: m('skill-schedule.plan-discussDocs.c039'), right: fmtDurShort(g.end - g.start) })),
        emptyText: m('skill-schedule.plan-discussDocs.c040'),
      }),
    }) },
    { html: renderPreBlock({
      label: m('skill-schedule.plan-discussDocs.c041'),
      command: m('skill-schedule.plan-discussDocs.c042', { p0: String(date) }),
      actionId: 'ilife-sch-plan-copy-next',
      copyLabel: m('skill-schedule.plan-discussDocs.c043'),
    }) },
    { navText: m('skill-schedule.plan-discussDocs.c044'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-discussDocs.c045'),
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-discussDocs.c046', {
          p0: String(date),
          p1: String(String(candidates.length)),
          p2: String(fmtDur(covered)),
          p3: String(String(overlaps.length)),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"preview","date":"' + date + '"}',
        source: m('skill-schedule.plan-discussDocs.c047', { p0: String(String(HISTORY_DAYS)) }),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
}

/* ─────────────────────── ② 制定次日计划结果（老侧 f17） ─────────────────────── */

/** 「制定次日计划结果」整页：时间轴与分类色带 ＋ 历史贴合提示 ＋ 冲突与警告 ＋ 复制 prompt 位。 */
export function resultPage(
  handle: ScheduleDb, date: string, candidates: readonly PlanEventInput[],
  locked: readonly PlanEvent[], remote: RemoteState,
): string {
  const written = listPlanEvents(handle, date);
  const records = listRecordsRange(handle, shiftDay(date, -HISTORY_DAYS), shiftDay(date, -1));
  const habits = habitsOf(records);
  const fits = candidates.map((e) => ({ event: e, ...fitOf(e.category, habits, e.time_start, e.time_end) }));
  const match = fits.filter((f) => f.fit === 'match').length;
  const drift = fits.filter((f) => f.fit === 'drift').length;
  const none = fits.filter((f) => f.fit === 'none').length;
  const referred = match + drift;
  const rate = referred === 0 ? null : Math.round((match / referred) * 1000) / 10;
  const overlaps = overlapsOf(candidates, locked);
  const covered = candidates.reduce((sum, e) => sum + (minutesOf(e.time_end) - minutesOf(e.time_start)), 0);
  /** 逐段贴合（四列：时段／标题／贴合／说明）：**不再单列分类那一栏**——说明句里已经点名
   *  两边各是什么，五列挤在 880 里会把「贴合」两个字折成两行（复看时抓到的版式债）。 */
  const fitRows: DataTableRow[] = fits.map((f) => ({
    time: span(f.event.time_start, f.event.time_end),
    title: f.event.title,
    fit: f.fit === 'match' ? m('skill-schedule.plan-discussDocs.c048') : (f.fit === 'drift' ? m('skill-schedule.plan-discussDocs.c049') : m('skill-schedule.plan-discussDocs.c050')),
    hint: f.hint,
  }));
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-discussDocs.c051'),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-discussDocs.c052'),
    subtitle: m('skill-schedule.plan-discussDocs.c053', {
      p0: String(date),
      p1: String(String(candidates.length)),
      p2: String(String(match)),
      p3: String(String(drift)),
    }),
  };
  // §4.7 · 提示句尾那一支是条件，抽成局部变量。
  const driftNote = drift === 0 ? '' : m('skill-schedule.plan-discussDocs.c054');
  // §4.7 · 结论串末尾那一支是条件（两支各含文案），先算成局部变量，链里只拼字面量＋变量。
  const rateNote = rate === null
    ? m('skill-schedule.plan-discussDocs.c055', { p0: String(String(HISTORY_DAYS)) })
    : m('skill-schedule.plan-discussDocs.c056', { p0: String(String(HISTORY_DAYS)), p1: String(String(rate)) });
  const { toc, body } = pageSections([
    { html: renderConclusionBar(m('skill-schedule.plan-discussDocs.c057', {
      p0: String(date),
      p1: String(String(written.length)),
      p2: String(fmtDur(covered)),
      p3: String(rateNote),
    })) },
    { navText: m('skill-schedule.plan-discussDocs.c058'), html: renderKpiGrid([
      { label: m('skill-schedule.plan-discussDocs.c059'), value: m('skill-schedule.plan-discussDocs.c060', { p0: String(String(candidates.length)) }), detail: date },
      {
        label: m('skill-schedule.plan-discussDocs.c061'), value: rate === null ? '—' : String(rate) + '%',
        detail: rate === null ? m('skill-schedule.plan-discussDocs.c062') : m('skill-schedule.plan-discussDocs.c063', { p0: String(String(match)), p1: String(String(drift)) }),
        ...(rate === null ? {} : { bar: { pct: Math.round(rate) } }),
      },
      { label: m('skill-schedule.plan-discussDocs.c064'), value: m('skill-schedule.plan-discussDocs.c065', { p0: String(String(drift)) }), detail: m('skill-schedule.plan-discussDocs.c066', { p0: String(String(none)) }) },
      { label: m('skill-schedule.plan-discussDocs.c067'), value: m('skill-schedule.plan-discussDocs.c068', { p0: String(String(overlaps.length)) }), detail: overlaps.length === 0 ? m('skill-schedule.plan-discussDocs.c069') : m('skill-schedule.plan-discussDocs.c070') },
    ], { title: m('skill-schedule.plan-discussDocs.c071') }) },
    // 段名是「24 小时时间轴与分类色带」；目录项逐字用它。
    { navText: m('skill-schedule.plan-discussDocs.c072'), html: renderHourBand(cellsOf(written), { order: L1_ORDER, title: m('skill-schedule.plan-discussDocs.c073'), height: 140 }) },
    { html: renderFactStrip({
      items: [
        { label: m('skill-schedule.plan-discussDocs.c074'), value: m('skill-schedule.plan-discussDocs.c075', { p0: String(String(HISTORY_DAYS)) }) },
        { label: m('skill-schedule.plan-discussDocs.c076'), value: m('skill-schedule.plan-discussDocs.c077', { p0: String(String(records.length)) }) },
        { label: m('skill-schedule.plan-discussDocs.c078'), value: remoteLabelOf(remote) },
        { label: m('skill-schedule.plan-discussDocs.c079'), value: m('skill-schedule.plan-discussDocs.c080', { p0: String(String(written.length)) }) },
      ],
    }) },
    { navText: m('skill-schedule.plan-discussDocs.c081'), html: renderFeedbackBlock({
      title: m('skill-schedule.plan-discussDocs.c082'),
      toast: {
        icon: rate === null ? 'info' : (drift === 0 ? 'ok' : 'warn'),
        msg: rate === null
          ? m('skill-schedule.plan-discussDocs.c083', { p0: String(String(HISTORY_DAYS)) })
          : m('skill-schedule.plan-discussDocs.c084', {
            p0: String(String(HISTORY_DAYS)),
            p1: String(String(match)),
            p2: String(String(drift)),
            p3: String(String(none)),
            p4: String(driftNote),
          }),
      },
      staticNotice: true,
    }) },
    { html: renderDataTable({
      caption: m('skill-schedule.plan-discussDocs.c085'),
      columns: [
        { key: 'time', label: m('skill-schedule.plan-discussDocs.c086') },
        { key: 'title', label: m('skill-schedule.plan-discussDocs.c087') },
        { key: 'fit', label: m('skill-schedule.plan-discussDocs.c088') },
        { key: 'hint', label: m('skill-schedule.plan-discussDocs.c089') },
      ],
      rows: fitRows,
      emptyText: m('skill-schedule.plan-discussDocs.c090'),
    }) },
    { navText: drift === 0 ? '' : m('skill-schedule.plan-discussDocs.c091'), html: drift === 0 ? '' : renderFeedbackBlock({
      title: m('skill-schedule.plan-discussDocs.c092'),
      toast: {
        icon: 'warn',
        msg: m('skill-schedule.plan-discussDocs.c093', {
          p0: String(String(drift)),
          p1: String(String(HISTORY_DAYS)),
        }),
        lines: fits.filter((f) => f.fit === 'drift').map((f) => span(f.event.time_start, f.event.time_end) + ' ' + f.event.title),
      },
      staticNotice: true,
    }) },
    { navText: m('skill-schedule.plan-discussDocs.c094'), html: renderFeedbackBlock({
      title: m('skill-schedule.plan-discussDocs.c095'),
      toast: overlaps.length === 0
        ? { icon: 'ok', msg: m('skill-schedule.plan-discussDocs.c096') }
        : {
          icon: 'danger',
          msg: m('skill-schedule.plan-discussDocs.c097', { p0: String(String(overlaps.length)) }),
          lines: overlaps.map((o) => m('skill-schedule.plan-discussDocs.c098', {
            p0: String(o.candidate),
            p1: String(o.locked),
            p2: String(o.overlap),
            p3: String(String(o.minutes)),
          })),
        },
      staticNotice: true,
    }) },
    { html: renderPreBlock({
      label: m('skill-schedule.plan-discussDocs.c099'),
      command: m('skill-schedule.plan-discussDocs.c100', { p0: String(date) }),
      actionId: 'ilife-sch-plan-copy-next',
      copyLabel: m('skill-schedule.plan-discussDocs.c101'),
    }) },
    { navText: m('skill-schedule.plan-discussDocs.c102'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-discussDocs.c103'),
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-discussDocs.c104', {
          p0: String(date),
          p1: String(String(candidates.length)),
          p2: String(fmtDur(covered)),
          p3: String(String(HISTORY_DAYS)),
          p4: String(String(records.length)),
          p5: String(rate === null ? '—' : String(rate) + '%'),
          p6: String(String(match)),
          p7: String(String(drift)),
          p8: String(String(none)),
          p9: String(remoteLabelOf(remote)),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"upsert","date":"' + date + '"}',
        source: m('skill-schedule.plan-discussDocs.c105', { p0: String(date), p1: String(String(written.length)) }),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
}
