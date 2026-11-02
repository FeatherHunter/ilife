/** #783 · 写入与同步域的**页数据与页装配**（口径层）：写库之后那几张结果页各自要什么。
 *
 *  为什么口径住这里、不住共用位：共用位不许出现任何一个能力的名字，而「缺口怎么算、回溯窗口多长、
 *  覆盖百分比的分母是谁、一级分类的权威顺序」全是**本域的口径**——摆好再交给页型函数与族级件。
 *
 *  **不重算别家口径**：记录块数／覆盖分钟／健康分直接调 `render/views.ts` 的 `buildRecordToday`
 *  （那是这枚 key 既有口径的唯一实现）；一级分类映射调 `policy` 的 `l1Of`，时间解析调 `toMinutes`。
 *
 *  四张页（老侧家族 → 写入与同步这一条命令的哪一支）：
 *    · 记作息结果（老侧 f07「记录三件套结果」）← `op=add`：全天时间轴 ＋ 过去几小时推断回溯 ＋ 状态总览，
 *      只记一级分类时页顶多一条细化提示（老侧 `cmd_add_record` 的 warning 位）；
 *    · 修正作息回执（老侧 f09「修正作息回执」）← `op=amend`：蓝调 diff ＋ 多字段前后对照；
 *    · 批量导入回执 ← `op=add` 带 `records[]`：逐条结果 ＋ 汇总（老侧 `batch-add` 的 ok／partial 语义）；
 *    · 写作息摘要回执 ← `op=summary`：写库回执（老侧这条无产物，本票按「每个唤醒词都落一份真页」补）。
 *
 *  **页上文案纪律**：一页里不出现命令键、库列名、英文裸词；并列关系一律用版面表达（卡片格／徽章列／
 *  键值行／对照行），不拿 `、`／`·`／`｜`／`；`／`~` 这些符号顶替设计——本票证据件里那条机器判据
 *  （分隔符门）量的就是这条。范围一律写「至」，不用波浪号。
 *
 *  #891 补的**页内定位**（不动件序列，只给已有的段名加锚点与页首目录）：判据（小节数 ≥ 3 出目录）
 *  与装配的唯一一处定义地在 `shared/pageNav.ts` 的 `SECTION_TOC_MIN`。
 *  **这一页型里被判为短页的是「写作息摘要回执」**：它恒 2 小节（`这次写了什么`／`复制与留档`）
 *  ⇒ `tocEl` 保持 0、D5 那条腿照旧扣 4；「批量导入回执」在有条目没通过校验时才出第 3 小节
 *  （`有几条没写进去`），全过那一档仍判短页。
 */
import {
  renderCaliberLine, renderConclusionBar, renderDataTable,
  renderDisclosure, renderFeedbackBlock, renderKpiGrid, renderPreBlock,
  type ChangeRowInput, type DataTableRow, type KpiCardInput,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import {
  DEFAULT_WHITELIST, LEVEL1_WHITELIST, fmtDur, fmtDurShort, fmtPct, l1Of, parseCategory, toMinutes,
} from '../policy/index.js';
import { listRecordsByDate, listRecordsRange } from '../fetch/index.js';
import { buildRecordToday } from '../render/index.js';
import { scheduleCopyArea, scheduleCopyLog, scheduleNowStamp, type ScheduleCopyAreaInput } from '../render/copyArea.js';
import type { ScheduleDb, ScheduleRecord } from '../fetch/db.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { pageSections } from '../shared/pageNav.js';
import { hourCellsOf, renderHourBand, type HourCell } from '../shared/pageParts.js';
import { renderDiffPanel, renderChipBand, renderPastHours, writePartsCss, type PastHourCard } from './writeParts.js';
import { m } from '../entries/index.js';

/** 回溯窗口＝这一条记录结束时刻往前推这么多分钟（老侧 `RECENT_HOURS = 3`）。 */
const RECENT_MINUTES = 3 * 60;
/** 来源消息与推理说明上屏前各截这么长（老侧 `_snip` 的 40／60）。 */
const SNIP_SOURCE = 40;
const SNIP_REASON = 60;
/** 批量回执逐条表最多摆几行（再多只出一句计数，别把页撑成一堵墙）。 */
const BATCH_ROWS_MAX = 40;

const DAY_MINUTES = 24 * 60;
const WEEK_DAYS = 7;

/** 域词（页眉那一行）与页名。#1197：取词在渲染期，故写成函数（模块级常量只会在加载期取到 zh）。 */
function eyebrow(): string { return m('skill-schedule.write-writeDocs.c150'); }

/** 修正作息回执的字段中文名（库列名与命令参数名都不上屏；一处定义）。
 *  #1197：取词在渲染期，故写成函数（模块级常量只会在加载期取到 zh）。 */
function fieldLabels(): Readonly<Record<string, string>> {
  return {
    date: m('skill-schedule.write-writeDocs.c151'),
    time_start: m('skill-schedule.write-writeDocs.c152'),
    time_end: m('skill-schedule.write-writeDocs.c153'),
    duration_minutes: m('skill-schedule.write-writeDocs.c154'),
    activity: m('skill-schedule.write-writeDocs.c155'),
    category: m('skill-schedule.write-writeDocs.c156'),
    source_contents: m('skill-schedule.write-writeDocs.c157'),
    source_timestamps: m('skill-schedule.write-writeDocs.c158'),
    analysis_reasoning: m('skill-schedule.write-writeDocs.c159'),
  };
}

const isoOf = (d: Date): string => d.toISOString().slice(0, 10);
const dayShift = (iso: string, days: number): string => {
  const t = new Date(iso + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + days);
  return isoOf(t);
};
const hhmm = (minutes: number): string => (minutes >= DAY_MINUTES
  ? '24:00'
  : String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0'));
/** 范围一律写「至」（不用波浪号，也不用短横）。 */
const span = (from: string, to: string): string => m('skill-schedule.write-writeDocs.c001', { p0: String(from), p1: String(to) });
const snip = (text: string, max: number): string => {
  const s = (text ?? '').trim();
  return s.length <= max ? s : s.slice(0, max) + '…';
};
/** **预览**（来源消息／推理说明这两处截断文本）的显示规范化：把「拿符号当分隔」的写法换回人话
 *  （范围写「至」，并列写「，」）——这两段本来就是摘要，改的是摘要的写法，不动库里那两列原文。
 *  **活动与分类原样上屏**：那是用户自己的话，不是我们的版面债，本函数不碰它们。 */
/** 范围连接词：整句在渲染期取词（宿主的 replace 第二参不迁，故先取成局部值）。 */
const rangeJoin = (): string => m('skill-schedule.write-writeDocs.c160');
const preview = (text: string, max: number): string => snip(
  (text ?? '').replace(/[~～]/g, ' ' + rangeJoin() + ' ').replace(/[·；｜|、／;]/g, '，').replace(/\s+/g, ' ').trim(),
  max,
);
const nowMinutes = (now: Date): number => now.getHours() * 60 + now.getMinutes();
/** 一级分类的权威顺序（配色与图例都照它）——定义只此一处：`policy` 的白名单。 */
const orderOf = (): string[] => [...LEVEL1_WHITELIST];

/** 一段缺口有多少分钟（`24:00` 经 `toMinutes` 读作 1440，跨零点那一段因此算得对）。 */
const gapMinutes = (gap: { from: string; to: string }): number => toMinutes(gap.to) - toMinutes(gap.from);

/** 单日缺口段（老侧 `_day_gap_slots` 口径：首条前 ＋ 相邻间隔 ＋ 末条后）。 */
function dayGapSlots(records: readonly ScheduleRecord[]): { from: string; to: string }[] {  const sorted = [...records]
    .filter((r) => r.time_start !== '' && r.time_end !== '')
    .sort((a, b) => (a.time_start < b.time_start ? -1 : a.time_start > b.time_start ? 1 : a.id - b.id));
  const slots: { from: string; to: string }[] = [];
  let cursor = 0;
  for (const r of sorted) {
    const ts = toMinutes(r.time_start);
    const te = Math.max(toMinutes(r.time_end), ts);
    if (ts > cursor) slots.push({ from: hhmm(cursor), to: hhmm(ts) });
    if (te > cursor) cursor = te;
  }
  if (cursor < DAY_MINUTES) slots.push({ from: hhmm(cursor), to: '24:00' });
  return slots;
}

function cellsOf(records: readonly ScheduleRecord[]): HourCell[] {
  return hourCellsOf(records.map((r) => ({
    start: toMinutes(r.time_start),
    end: toMinutes(r.time_end),
    key: l1Of(r.category),
  })));
}

/** 复制区载荷（#887）：这四张页都在 `schedule.record.write` 这一枚 key 上，形状是**回执**
 *  ——数据位＝一份回执（`ok` ＋ `message`，消息里写清这一趟的事实），日志位＝这一趟的 2–6 段。
 *  `message` 用逗号串成一句话：复制文本走 `buildDataText` 的 text 口径，行内换行会并成一行。 */
function writeCopy(title: string, lines: readonly string[], command: string, source: string, ok = true): ScheduleCopyAreaInput {
  return {
    key: 'schedule.record.write',
    payload: { ok, message: title + '：' + lines.join('，') + '。' },
    log: scheduleCopyLog({ command, source, actionAt: scheduleNowStamp() }),
  };
}

/* ─────────────────────────── ① 记作息结果（老侧 f07） ─────────────────────────── */

/** 只记了一级分类时那条细化提示 ＋ 候选二级徽章列（老侧 `cmd_add_record` 的 warning 位）。 */
function l1OnlyNotice(category: string): string {
  const level2 = DEFAULT_WHITELIST[category] ?? [];
  const notice = renderFeedbackBlock({
    title: m('skill-schedule.write-writeDocs.c002'),
    toast: { icon: 'warn', msg: m('skill-schedule.write-writeDocs.c003', { p0: String(category) }) },
    staticNotice: true,
  });
  return notice + renderChipBand(level2);
}

/** 三条「接下来可以说什么」：整句可复制（老侧三个操作按钮的 prompt 位）。 */
function nextSteps(date: string, record: ScheduleRecord): string {
  const lines = [
    m('skill-schedule.write-writeDocs.c004', { p0: String(date), p1: String(record.time_end) }),
    m('skill-schedule.write-writeDocs.c005', { p0: String(date) }),
    m('skill-schedule.write-writeDocs.c006', { p0: String(date) }),
  ];
  const labels = [m('skill-schedule.write-writeDocs.c007'), m('skill-schedule.write-writeDocs.c008'), m('skill-schedule.write-writeDocs.c009')];
  const blocks = lines.map((command, i) => renderPreBlock({
    label: labels[i],
    command,
    actionId: 'ilife-sch-write-next-' + String(i + 1),
    copyLabel: m('skill-schedule.write-writeDocs.c010'),
  })).join('');
  return renderDisclosure({ title: m('skill-schedule.write-writeDocs.c011'), contentHtml: blocks });
}

/** 「记作息结果」整页：状态总览 ＋ 全天时间轴 ＋ 过去几小时推断回溯（老侧三件套），只记一级时加提示。 */
export function recordResultPage(handle: ScheduleDb, record: ScheduleRecord, now: Date = new Date()): string {
  const date = record.date;
  const records = listRecordsByDate(handle, date);
  const view = buildRecordToday(date, [...records]);
  const gaps = dayGapSlots(records);
  const week = listRecordsRange(handle, dayShift(date, -(WEEK_DAYS - 1)), date);
  const isToday = date === isoOf(now);
  const passed = isToday ? Math.max(nowMinutes(now), 1) : DAY_MINUTES;
  const coveragePct = Math.min(Math.round((view.coverage / passed) * 1000) / 10, 100);
  // ② 过去几小时推断回溯：窗口 ＝ 这一条结束时刻往前推 3 小时；跨到别天的不算。
  const anchor = toMinutes(record.time_end);
  const windowStart = Math.max(0, anchor - RECENT_MINUTES);
  const recent = [...records]
    .filter((r) => toMinutes(r.time_end) > windowStart && toMinutes(r.time_start) < anchor)
    .sort((a, b) => toMinutes(b.time_end) - toMinutes(a.time_end));
  const cards: PastHourCard[] = recent.map((r) => ({
    time: span(r.time_start, r.time_end),
    activity: r.activity,
    category: r.category,
    duration: fmtDurShort(r.duration_minutes ?? 0),
    source: preview(r.source_contents ?? '', SNIP_SOURCE),
    reasoning: preview(r.analysis_reasoning ?? '', SNIP_REASON),
    isNew: r.id === record.id,
  }));
  const level1 = l1Of(record.category);
  const level2 = parseCategory(record.category).level2;
  const sameCategory = records.filter((r) => r.category === record.category).length;
  const kpis: KpiCardInput[] = [
    { label: m('skill-schedule.write-writeDocs.c012'), value: m('skill-schedule.write-writeDocs.c013', { p0: String(String(view.total)) }), detail: date },
    {
      label: m('skill-schedule.write-writeDocs.c014'), value: fmtDurShort(view.coverage),
      detail: m('skill-schedule.write-writeDocs.c015', { p0: String(fmtDurShort(passed)), p1: String(coveragePct) }),
      bar: { pct: Math.round(coveragePct) },
    },
    {
      label: m('skill-schedule.write-writeDocs.c016'), value: m('skill-schedule.write-writeDocs.c017', { p0: String(String(gaps.length)) }),
      detail: gaps.length === 0
        ? m('skill-schedule.write-writeDocs.c018')
        : m('skill-schedule.write-writeDocs.c019', {
          p0: String(String(gaps.reduce((sum, g) => sum + gapMinutes(g), 0))),
        }),
    },
    { label: m('skill-schedule.write-writeDocs.c020'), value: m('skill-schedule.write-writeDocs.c021', { p0: String(String(week.length)) }), detail: m('skill-schedule.write-writeDocs.c022') },
  ];
  const head: PageHead = {
    docTitle: m('skill-schedule.write-writeDocs.c023'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.write-writeDocs.c024'),
    subtitle: m('skill-schedule.write-writeDocs.c025', {
      p0: String(date),
      p1: String(span(record.time_start, record.time_end)),
      p2: String(record.activity),
      p3: String(record.category),
    }),
  };
  const { toc, body } = pageSections([
    { navText: level2 === null ? m('skill-schedule.write-writeDocs.c026') : '', html: level2 === null ? l1OnlyNotice(level1) : '' },
    { html: renderConclusionBar(m('skill-schedule.write-writeDocs.c027', {
      p0: String(date),
      p1: String(view.total),
      p2: String(view.score),
    })) },
    { navText: m('skill-schedule.write-writeDocs.c028'), html: renderKpiGrid(kpis, { title: m('skill-schedule.write-writeDocs.c029') }) },
    { navText: m('skill-schedule.write-writeDocs.c030'), html: renderHourBand(cellsOf(records), { order: orderOf(), title: m('skill-schedule.write-writeDocs.c031'), height: 140 }) },
    { html: renderFactStrip({
      items: [
        { label: m('skill-schedule.write-writeDocs.c032'), value: span(hhmm(windowStart), record.time_end) },
        { label: m('skill-schedule.write-writeDocs.c033'), value: span(record.time_start, record.time_end) },
        { label: m('skill-schedule.write-writeDocs.c034'), value: m('skill-schedule.write-writeDocs.c035', { p0: String(String(sameCategory)) }) },
        { label: m('skill-schedule.write-writeDocs.c036'), value: fmtPct(record.duration_minutes ?? 0, view.coverage) + '%' },
      ],
    }) },
    { navText: m('skill-schedule.write-writeDocs.c037'), html: renderPastHours({
      title: m('skill-schedule.write-writeDocs.c038'),
      cards,
      emptyText: m('skill-schedule.write-writeDocs.c039'),
    }) },
    { html: nextSteps(date, record) },
    { navText: m('skill-schedule.write-writeDocs.c040'), html: scheduleCopyArea({
      title: m('skill-schedule.write-writeDocs.c041'),
      dataActionId: 'ilife-sch-write-copy-data',
      logActionId: 'ilife-sch-write-copy-log',
      ...writeCopy(m('skill-schedule.write-writeDocs.c042'), [
        m('skill-schedule.write-writeDocs.c043', { p0: String(date) }),
        m('skill-schedule.write-writeDocs.c044', {
          p0: String(span(record.time_start, record.time_end)),
          p1: String(record.activity),
        }),
        m('skill-schedule.write-writeDocs.c045', { p0: String(record.category) }),
        m('skill-schedule.write-writeDocs.c046', {
          p0: String(view.total),
          p1: String(fmtDur(view.coverage)),
          p2: String(view.score),
        }),
      ], 'schedule-cmd-read schedule.record.write --params {"op":"add","date":"' + date
        + '","time_start":"' + record.time_start + '","time_end":"' + record.time_end
        + '","activity":"' + record.activity + '","category":"' + record.category + '"}',
      m('skill-schedule.write-writeDocs.c047')),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: writePartsCss() });
}

/* ─────────────────────────── ② 修正作息回执（老侧 f09） ─────────────────────────── */

/** 一个字段改前改后长什么样（时长补单位、空值写破折号）。 */
function fieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'duration_minutes') return m('skill-schedule.write-writeDocs.c048', { p0: String(String(value)) });
  return String(value);
}

/** 「修正作息回执」整页：蓝调 diff ＋ 多字段前后对照 ＋ 这条记录现在的样子。 */
export function amendReceiptPage(
  before: ScheduleRecord, after: ScheduleRecord, patchKeys: readonly string[], now: Date = new Date(),
): string {
  const rows: ChangeRowInput[] = patchKeys
    .filter((key) => fieldLabels()[key] !== undefined)
    .map((key) => ({
      label: fieldLabels()[key],
      before: fieldValue(key, (before as unknown as Record<string, unknown>)[key]),
      after: fieldValue(key, (after as unknown as Record<string, unknown>)[key]),
    }));
  const older = after.date < isoOf(now);
  const stale = older
    ? renderFeedbackBlock({
      title: m('skill-schedule.write-writeDocs.c049'),
      toast: {
        icon: 'warn',
        msg: m('skill-schedule.write-writeDocs.c050', { p0: String(after.date) }),
      },
      staticNotice: true,
    })
    : '';
  const current: DataTableRow[] = [
    { k: m('skill-schedule.write-writeDocs.c051'), v: after.date },
    { k: m('skill-schedule.write-writeDocs.c052'), v: span(after.time_start, after.time_end) },
    { k: m('skill-schedule.write-writeDocs.c053'), v: fmtDur(after.duration_minutes ?? 0) },
    { k: m('skill-schedule.write-writeDocs.c054'), v: after.activity },
    { k: m('skill-schedule.write-writeDocs.c055'), v: after.category },
    { k: m('skill-schedule.write-writeDocs.c056'), v: fieldValue('source_contents', after.source_contents) },
    { k: m('skill-schedule.write-writeDocs.c057'), v: fieldValue('source_timestamps', after.source_timestamps) },
    { k: m('skill-schedule.write-writeDocs.c058'), v: fieldValue('analysis_reasoning', after.analysis_reasoning) },
  ];
  const head: PageHead = {
    docTitle: m('skill-schedule.write-writeDocs.c059'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.write-writeDocs.c060'),
    subtitle: m('skill-schedule.write-writeDocs.c061', {
      p0: String(after.edit_count),
      p1: String(after.date),
      p2: String(span(after.time_start, after.time_end)),
    }),
  };
  const { toc, body } = pageSections([
    { html: stale },
    { html: renderConclusionBar(m('skill-schedule.write-writeDocs.c062')) },
    { navText: m('skill-schedule.write-writeDocs.c063'), html: renderKpiGrid([
      { label: m('skill-schedule.write-writeDocs.c064'), value: after.date, detail: span(after.time_start, after.time_end) },
      { label: m('skill-schedule.write-writeDocs.c065'), value: m('skill-schedule.write-writeDocs.c066', { p0: String(after.edit_count) }), detail: m('skill-schedule.write-writeDocs.c067') },
      { label: m('skill-schedule.write-writeDocs.c068'), value: after.category, detail: m('skill-schedule.write-writeDocs.c069', { p0: String(l1Of(after.category)) }) },
      { label: m('skill-schedule.write-writeDocs.c070'), value: after.activity, detail: fmtDur(after.duration_minutes ?? 0) },
    ], { title: m('skill-schedule.write-writeDocs.c071') }) },
    { navText: m('skill-schedule.write-writeDocs.c072'), html: renderDiffPanel({ title: m('skill-schedule.write-writeDocs.c073'), rows }) },
    { html: renderDisclosure({
      title: m('skill-schedule.write-writeDocs.c074'),
      contentHtml: renderDataTable({
        columns: [{ key: 'k', label: m('skill-schedule.write-writeDocs.c075') }, { key: 'v', label: m('skill-schedule.write-writeDocs.c076') }],
        rows: current,
      }),
    }) },
    { html: renderCaliberLine(m('skill-schedule.write-writeDocs.c077')) },
    { navText: m('skill-schedule.write-writeDocs.c078'), html: scheduleCopyArea({
      title: m('skill-schedule.write-writeDocs.c079'),
      dataActionId: 'ilife-sch-write-copy-data',
      logActionId: 'ilife-sch-write-copy-log',
      ...writeCopy(m('skill-schedule.write-writeDocs.c080'), [
        m('skill-schedule.write-writeDocs.c081', { p0: String(after.date) }),
        m('skill-schedule.write-writeDocs.c082', {
          p0: String(String(rows.length)),
          p1: String(rows.map((r) => r.label).join('，')),
        }),
        m('skill-schedule.write-writeDocs.c083', { p0: String(after.category) }),
        m('skill-schedule.write-writeDocs.c084', { p0: String(after.activity) }),
        m('skill-schedule.write-writeDocs.c085', { p0: String(after.edit_count) }),
      ], 'schedule-cmd-read schedule.record.write --params {"op":"amend","id":' + String(after.id) + '}',
      m('skill-schedule.write-writeDocs.c086', { p0: String(String(after.edit_count)) })),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: writePartsCss() });
}

/* ─────────────────────────── ③ 批量导入回执 ─────────────────────────── */

/** 批量里的一条结果（口径见 `handlers.ts`；原因一律中文，库列名与命令参数名不上屏）。 */
export interface BatchRow {
  readonly seq: number;
  readonly time: string;
  readonly activity: string;
  readonly category: string;
  /** 写入成功那一格写「已写入」，没通过的写中文原因。 */
  readonly result: string;
  readonly ok: boolean;
}

/** 「批量导入回执」整页：收到条数／写入成功／没通过 ＋ 逐条结果。 */
export function batchReceiptPage(input: {
  readonly date: string;
  readonly rows: readonly BatchRow[];
}): string {
  const total = input.rows.length;
  const done = input.rows.filter((r) => r.ok).length;
  const failed = total - done;
  const shown = input.rows.slice(0, BATCH_ROWS_MAX);
  const left = total - shown.length;
  const tableRows: DataTableRow[] = shown.map((r) => ({
    n: String(r.seq),
    time: r.time,
    activity: r.activity,
    category: r.category,
    result: r.result,
  }));
  const head: PageHead = {
    docTitle: m('skill-schedule.write-writeDocs.c087'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.write-writeDocs.c088'),
    subtitle: m('skill-schedule.write-writeDocs.c089', { p0: String(input.date), p1: String(total), p2: String(done) }),
  };
  const { toc, body } = pageSections([
    { navText: failed === 0 ? '' : m('skill-schedule.write-writeDocs.c090'), html: failed === 0 ? '' : renderFeedbackBlock({
      title: m('skill-schedule.write-writeDocs.c091'),
      toast: {
        icon: 'warn',
        msg: m('skill-schedule.write-writeDocs.c092', { p0: String(failed) }),
      },
      staticNotice: true,
    }) },
    { html: renderConclusionBar(failed === 0
      ? m('skill-schedule.write-writeDocs.c093', { p0: String(total) })
      : m('skill-schedule.write-writeDocs.c094', { p0: String(total), p1: String(done), p2: String(failed) })) },
    { navText: m('skill-schedule.write-writeDocs.c095'), html: renderKpiGrid([
      { label: m('skill-schedule.write-writeDocs.c096'), value: m('skill-schedule.write-writeDocs.c097', { p0: String(String(total)) }), detail: input.date },
      { label: m('skill-schedule.write-writeDocs.c098'), value: m('skill-schedule.write-writeDocs.c099', { p0: String(String(done)) }), detail: m('skill-schedule.write-writeDocs.c100') },
      { label: m('skill-schedule.write-writeDocs.c101'), value: m('skill-schedule.write-writeDocs.c102', { p0: String(String(failed)) }), detail: failed === 0 ? m('skill-schedule.write-writeDocs.c103') : m('skill-schedule.write-writeDocs.c104') },
      {
        label: m('skill-schedule.write-writeDocs.c105'), value: String(total === 0 ? 0 : Math.round((done / total) * 100)) + '%',
        detail: String(done) + ' ／ ' + String(total),
      },
    ], { title: m('skill-schedule.write-writeDocs.c106') }) },
    { html: renderDataTable({
      caption: m('skill-schedule.write-writeDocs.c107'),
      columns: [
        { key: 'n', label: m('skill-schedule.write-writeDocs.c108') },
        { key: 'time', label: m('skill-schedule.write-writeDocs.c109') },
        { key: 'activity', label: m('skill-schedule.write-writeDocs.c110') },
        { key: 'category', label: m('skill-schedule.write-writeDocs.c111') },
        { key: 'result', label: m('skill-schedule.write-writeDocs.c112') },
      ],
      rows: tableRows,
      emptyText: m('skill-schedule.write-writeDocs.c113'),
    }) },
    { html: left <= 0 ? '' : renderCaliberLine(m('skill-schedule.write-writeDocs.c114', { p0: String(left) })) },
    { navText: m('skill-schedule.write-writeDocs.c115'), html: scheduleCopyArea({
      title: m('skill-schedule.write-writeDocs.c116'),
      dataActionId: 'ilife-sch-write-copy-data',
      logActionId: 'ilife-sch-write-copy-log',
      ...writeCopy(m('skill-schedule.write-writeDocs.c117'), [
        m('skill-schedule.write-writeDocs.c118', { p0: String(input.date) }),
        m('skill-schedule.write-writeDocs.c119', { p0: String(total), p1: String(done), p2: String(failed) }),
        ...input.rows.map((r) => m('skill-schedule.write-writeDocs.c120', {
          p0: String(r.seq),
          p1: String(r.time),
          p2: String(r.activity),
          p3: String(r.result),
        })),
      ], m('skill-schedule.write-writeDocs.c121', { p0: String(String(total)) }),
      m('skill-schedule.write-writeDocs.c122', { p0: String(done) }), failed === 0),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: writePartsCss() });
}

/* ─────────────────────────── ④ 写作息摘要回执 ─────────────────────────── */

/** 「写作息摘要回执」整页：这次写了什么 ＋ 当日这一支的现状（老侧这条无产物，新给一份真页）。 */
export function summaryReceiptPage(
  handle: ScheduleDb, summary: { date: string; category: string; totalMinutes: number },
): string {
  const records = listRecordsByDate(handle, summary.date);
  const inLevel1 = records.filter((r) => l1Of(r.category) === summary.category);
  const level1Minutes = inLevel1.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const dayMinutes = records.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const head: PageHead = {
    docTitle: m('skill-schedule.write-writeDocs.c123'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.write-writeDocs.c124'),
    subtitle: m('skill-schedule.write-writeDocs.c125', {
      p0: String(summary.date),
      p1: String(summary.category),
      p2: String(fmtDur(summary.totalMinutes)),
    }),
  };
  const { toc, body } = pageSections([
    { html: renderConclusionBar(m('skill-schedule.write-writeDocs.c126', {
      p0: String(summary.date),
      p1: String(summary.category),
      p2: String(fmtDur(summary.totalMinutes)),
    })) },
    { navText: m('skill-schedule.write-writeDocs.c127'), html: renderKpiGrid([
      { label: m('skill-schedule.write-writeDocs.c128'), value: summary.date, detail: m('skill-schedule.write-writeDocs.c129') },
      { label: m('skill-schedule.write-writeDocs.c130'), value: summary.category, detail: m('skill-schedule.write-writeDocs.c131') },
      { label: m('skill-schedule.write-writeDocs.c132'), value: fmtDur(summary.totalMinutes), detail: m('skill-schedule.write-writeDocs.c133') },
      { label: m('skill-schedule.write-writeDocs.c134'), value: m('skill-schedule.write-writeDocs.c135', { p0: String(String(inLevel1.length)) }), detail: m('skill-schedule.write-writeDocs.c136') },
    ], { title: m('skill-schedule.write-writeDocs.c137') }) },
    { html: renderFactStrip({
      items: [
        { label: m('skill-schedule.write-writeDocs.c138'), value: fmtDur(level1Minutes) },
        { label: m('skill-schedule.write-writeDocs.c139'), value: fmtDur(dayMinutes) },
        { label: m('skill-schedule.write-writeDocs.c140'), value: fmtPct(level1Minutes, dayMinutes) + '%' },
      ],
    }) },
    { html: renderCaliberLine(m('skill-schedule.write-writeDocs.c141')) },
    { navText: m('skill-schedule.write-writeDocs.c142'), html: scheduleCopyArea({
      title: m('skill-schedule.write-writeDocs.c143'),
      dataActionId: 'ilife-sch-write-copy-data',
      logActionId: 'ilife-sch-write-copy-log',
      ...writeCopy(m('skill-schedule.write-writeDocs.c144'), [
        m('skill-schedule.write-writeDocs.c145', { p0: String(summary.date) }),
        m('skill-schedule.write-writeDocs.c146', { p0: String(summary.category) }),
        m('skill-schedule.write-writeDocs.c147', { p0: String(fmtDur(summary.totalMinutes)) }),
        m('skill-schedule.write-writeDocs.c148', { p0: String(fmtDur(level1Minutes)) }),
      ], 'schedule-cmd-read schedule.record.write --params {"op":"summary","date":"' + summary.date
        + '","category":"' + summary.category + '","total_minutes":' + String(summary.totalMinutes) + '}',
      m('skill-schedule.write-writeDocs.c149')),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: writePartsCss() });
}
