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
import { hourCellsOf, renderHourBand } from '../shared/pageParts.js';
import { clockOf, gapsOf, minutesOfDayEnd } from './planDocs.js';
import { shiftDay } from './iso.js';
import { REMOTE_LABEL, planCopyArea, type RemoteState } from './receipt.js';
import { planPartsCss } from './planParts.js';

const EYEBROW = '作息管家 日程与计划';
/** 一级分类的权威顺序（色带配色与图例都照它），定义只此一处：`policy` 的白名单。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];
/** 历史窗口（天）：老侧 `plan_scenarios.DEFAULT_HISTORY_DAYS`。 */
const HISTORY_DAYS = 7;
const HOURS_PER_DAY = 24;

const span = (start: string, end: string): string => start + ' 至 ' + end;
const categoryOf = (c: string | null | undefined): string => (c === null || c === undefined || c === '' ? '未分类' : c);
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
  if (top === null) return { fit: 'none', hint: '该时段近几天没有作息记录，这一条没有历史可参照。' };
  const mine = categoryOf(category);
  if (category === null || category === undefined || category === '') {
    return { fit: 'none', hint: '这一条没有标分类，历史该时段主要是「' + top.category + '」。' };
  }
  if (mine === top.category) {
    return { fit: 'match', hint: '贴合历史：该时段近几天主要是「' + top.category + '」。' };
  }
  return {
    fit: 'drift',
    hint: '与历史不同：该时段近几天主要是「' + top.category + '」（' + String(top.count) + ' 次），这一条排的是「' + mine + '」。',
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
    docTitle: '作息管家 商量计划预览',
    eyebrow: EYEBROW,
    title: '商量计划预览',
    subtitle: '候选 ' + String(candidates.length) + ' 段排的是 ' + date + '，这一步只预览，没有写库。',
  };
  const content = [
    renderConclusionBar('候选 ' + String(candidates.length) + ' 段把 ' + date + ' 的 24 小时接满，'
      + '共 ' + fmtDur(covered) + '。这一天现在已有 ' + String(locked.length) + ' 件，其中 '
      + String(overlaps.length) + ' 处与候选时段重叠。'),
    renderKpiGrid([
      { label: '候选段数', value: String(candidates.length) + ' 段', detail: '这一版商量出来的' },
      {
        label: '24 小时覆盖', value: fmtDur(covered),
        detail: covered >= HOURS_PER_DAY * 60 ? '整天接满，可以落盘' : '还没接满，先补上缺口',
        bar: { pct: Math.min(100, Math.round((covered / (HOURS_PER_DAY * 60)) * 100)) },
      },
      { label: '与已有重叠', value: String(overlaps.length) + ' 处', detail: overlaps.length === 0 ? '与原有排布不搭边' : '落盘前先看一眼' },
      { label: '这一天已有', value: String(locked.length) + ' 件', detail: '现在库里的排布' },
    ], { title: '这一版候选的读数' }),
    renderHourBand(cellsOf(candidates), { order: L1_ORDER, title: '候选的 24 小时', height: 120 }),
    renderDataTable({
      caption: '候选事件',
      columns: [
        { key: 'time', label: '时段' },
        { key: 'title', label: '标题' },
        { key: 'category', label: '分类' },
        { key: 'notes', label: '备注' },
      ],
      rows,
      emptyText: '这一版一段也没给',
    }),
    renderCaliberLine('候选是把这一天整段重排 ｜ 落盘时先按日期整日覆盖，候选之外的那些会被标记成不再算'),
    renderDisclosure({
      title: '锁定事件区',
      contentHtml: (locked.length === 0
        ? '<p class="sch-pl-note">这一天现在库里没有别的安排，落盘不会顶掉任何一件。</p>'
        : '<p class="sch-pl-note">这些是这一天现在库里的排布，落盘时会被候选整段换掉。</p>')
        + renderListRows({ items: lockedRows, emptyText: '这一天现在库里没有别的安排' }),
    }),
    renderDisclosure({
      title: '空隙提示',
      contentHtml: renderListRows({
        items: gaps.map((g) => ({ left: span(clockOf(g.start), clockOf(g.end)), main: '空隙', right: fmtDurShort(g.end - g.start) })),
        emptyText: '候选把 24 小时一段接一段接满了，没有空隙。',
      }),
    }),
    renderPreBlock({
      label: '认可这一版就说这一句',
      command: '按这一版把 ' + date + ' 的计划落下来',
      actionId: 'ilife-sch-plan-copy-next',
      copyLabel: '复制这句话',
    }),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: '商量计划预览：日期 ' + date + '，候选 ' + String(candidates.length) + ' 段共 ' + fmtDur(covered)
          + '，与已有重叠 ' + String(overlaps.length) + ' 处',
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"preview","date":"' + date + '"}',
        source: '日程计划表与作息记录表（近 ' + String(HISTORY_DAYS) + ' 天）',
      }),
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: planPartsCss() });
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
    fit: f.fit === 'match' ? '贴合' : (f.fit === 'drift' ? '偏离' : '无参考'),
    hint: f.hint,
  }));
  const head: PageHead = {
    docTitle: '作息管家 制定次日计划结果',
    eyebrow: EYEBROW,
    title: '制定次日计划结果',
    subtitle: '落下来的是 ' + date + '，候选 ' + String(candidates.length) + ' 段，'
      + '贴历史 ' + String(match) + ' 段，偏离 ' + String(drift) + ' 段。',
  };
  const content = [
    renderConclusionBar('这一版已经落盘：' + date + ' 现在排着 ' + String(written.length) + ' 件，'
      + '共 ' + fmtDur(covered) + '。' + (rate === null
        ? '近 ' + String(HISTORY_DAYS) + ' 天没有作息记录，贴合与否无从比较。'
        : '与近 ' + String(HISTORY_DAYS) + ' 天的作息习惯贴合率 ' + String(rate) + '%。')),
    renderKpiGrid([
      { label: '候选段数', value: String(candidates.length) + ' 段', detail: date },
      {
        label: '历史贴合率', value: rate === null ? '—' : String(rate) + '%',
        detail: rate === null ? '没有可比的记录' : '贴合 ' + String(match) + ' 段，偏离 ' + String(drift) + ' 段',
        ...(rate === null ? {} : { bar: { pct: Math.round(rate) } }),
      },
      { label: '偏离与无参考', value: String(drift) + ' 段偏离', detail: '另有 ' + String(none) + ' 段无历史可参照' },
      { label: '冲突', value: String(overlaps.length) + ' 处', detail: overlaps.length === 0 ? '与原有排布不搭边' : '采纳前先看一眼' },
    ], { title: '这一版的读数' }),
    renderHourBand(cellsOf(written), { order: L1_ORDER, title: '24 小时时间轴与分类色带', height: 140 }),
    renderFactStrip({
      items: [
        { label: '历史窗口', value: String(HISTORY_DAYS) + ' 天' },
        { label: '这段窗口的作息记录', value: String(records.length) + ' 条' },
        { label: '远端侧', value: REMOTE_LABEL[remote] },
        { label: '这一天现在', value: String(written.length) + ' 件' },
      ],
    }),
    renderFeedbackBlock({
      title: '历史贴合提示',
      toast: {
        icon: rate === null ? 'info' : (drift === 0 ? 'ok' : 'warn'),
        msg: rate === null
          ? '近 ' + String(HISTORY_DAYS) + ' 天没有作息记录，这一版没有历史可参照，逐段都按无参考算。'
          : '拿近 ' + String(HISTORY_DAYS) + ' 天的作息记录按整点归类：贴合 ' + String(match) + ' 段，偏离 '
            + String(drift) + ' 段，无参考 ' + String(none) + ' 段。',
        lines: fits.filter((f) => f.fit === 'drift').map((f) => f.hint),
      },
      staticNotice: true,
    }),
    renderDataTable({
      caption: '逐段贴合',
      columns: [
        { key: 'time', label: '时段' },
        { key: 'title', label: '标题' },
        { key: 'fit', label: '贴合' },
        { key: 'hint', label: '说明' },
      ],
      rows: fitRows,
      emptyText: '这一版一段也没给',
    }),
    drift === 0 ? '' : renderFeedbackBlock({
      title: '偏离警示',
      toast: {
        icon: 'warn',
        msg: '有 ' + String(drift) + ' 段与近 ' + String(HISTORY_DAYS) + ' 天的作息习惯不同，可能是刻意安排，也可能是排错了。',
        lines: fits.filter((f) => f.fit === 'drift').map((f) => span(f.event.time_start, f.event.time_end) + ' ' + f.event.title),
      },
      staticNotice: true,
    }),
    renderFeedbackBlock({
      title: '冲突与警告',
      toast: overlaps.length === 0
        ? { icon: 'ok', msg: '这一版候选与这一天原来的排布没有时段重叠。' }
        : {
          icon: 'danger',
          msg: '有 ' + String(overlaps.length) + ' 处候选与落盘前原有的事件时段重叠。',
          lines: overlaps.map((o) => o.candidate + ' ↔ ' + o.locked + '，重叠 ' + o.overlap + '（' + String(o.minutes) + ' 分钟）'),
        },
      staticNotice: true,
    }),
    renderPreBlock({
      label: '要再改这一版就说这一句',
      command: '把 ' + date + ' 的计划再调整一版',
      actionId: 'ilife-sch-plan-copy-next',
      copyLabel: '复制这句话',
    }),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: '制定次日计划结果：日期 ' + date + '，候选 ' + String(candidates.length) + ' 段共 ' + fmtDur(covered)
          + '，历史窗口近 ' + String(HISTORY_DAYS) + ' 天共 ' + String(records.length) + ' 条作息记录，贴合率 '
          + (rate === null ? '—' : String(rate) + '%') + '（贴合 ' + String(match) + ' 段，偏离 ' + String(drift)
          + ' 段，无参考 ' + String(none) + ' 段），远端侧 ' + REMOTE_LABEL[remote],
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"upsert","date":"' + date + '"}',
        source: '日程计划表（' + date + ' 落库 ' + String(written.length) + ' 件）',
      }),
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: planPartsCss() });
}
