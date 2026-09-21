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
 */
import {
  renderCaliberLine, renderConclusionBar, renderCopyBlock, renderDataTable,
  renderDisclosure, renderFeedbackBlock, renderKpiGrid, renderPreBlock,
  type ChangeRowInput, type DataTableRow, type KpiCardInput,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import {
  DEFAULT_WHITELIST, LEVEL1_WHITELIST, fmtDur, fmtDurShort, fmtPct, l1Of, parseCategory, toMinutes,
} from '../policy/index.js';
import { listRecordsByDate, listRecordsRange } from '../fetch/index.js';
import { buildRecordToday } from '../render/index.js';
import type { ScheduleDb, ScheduleRecord } from '../fetch/db.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { hourCellsOf, renderHourBand, type HourCell } from '../shared/pageParts.js';
import { renderDiffPanel, renderChipBand, renderPastHours, writePartsCss, type PastHourCard } from './writeParts.js';

/** 回溯窗口＝这一条记录结束时刻往前推这么多分钟（老侧 `RECENT_HOURS = 3`）。 */
const RECENT_MINUTES = 3 * 60;
/** 来源消息与推理说明上屏前各截这么长（老侧 `_snip` 的 40／60）。 */
const SNIP_SOURCE = 40;
const SNIP_REASON = 60;
/** 批量回执逐条表最多摆几行（再多只出一句计数，别把页撑成一堵墙）。 */
const BATCH_ROWS_MAX = 40;

const DAY_MINUTES = 24 * 60;
const WEEK_DAYS = 7;

/** 域词（页眉那一行）与页名。 */
const EYEBROW = '作息管家 写入与同步';

/** 修正作息回执的字段中文名（库列名与命令参数名都不上屏；一处定义）。 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  date: '日期',
  time_start: '开始时间',
  time_end: '结束时间',
  duration_minutes: '时长',
  activity: '活动',
  category: '分类',
  source_contents: '来源消息',
  source_timestamps: '来源时间',
  analysis_reasoning: '推理说明',
};

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
const span = (from: string, to: string): string => from + ' 至 ' + to;
const snip = (text: string, max: number): string => {
  const s = (text ?? '').trim();
  return s.length <= max ? s : s.slice(0, max) + '…';
};
/** **预览**（来源消息／推理说明这两处截断文本）的显示规范化：把「拿符号当分隔」的写法换回人话
 *  （范围写「至」，并列写「，」）——这两段本来就是摘要，改的是摘要的写法，不动库里那两列原文。
 *  **活动与分类原样上屏**：那是用户自己的话，不是我们的版面债，本函数不碰它们。 */
const preview = (text: string, max: number): string => snip(
  (text ?? '').replace(/[~～]/g, ' 至 ').replace(/[·；｜|、／;]/g, '，').replace(/\s+/g, ' ').trim(),
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

/** 复制与留档两段文本（同类页共用同一套字段名）。 */
function copyOf(title: string, lines: readonly string[]): { dataText: string; logText: string } {
  return {
    dataText: '【' + title + '】\n' + lines.join('\n'),
    logText: '场景：' + title + '\n' + lines.join('\n'),
  };
}

/* ─────────────────────────── ① 记作息结果（老侧 f07） ─────────────────────────── */

/** 只记了一级分类时那条细化提示 ＋ 候选二级徽章列（老侧 `cmd_add_record` 的 warning 位）。 */
function l1OnlyNotice(category: string): string {
  const level2 = DEFAULT_WHITELIST[category] ?? [];
  const notice = renderFeedbackBlock({
    title: '这条可以再细一档',
    toast: { icon: 'warn', msg: '这一条只记到一级分类「' + category + '」，二级还空着。' },
    staticNotice: true,
  });
  return notice + renderChipBand(level2);
}

/** 三条「接下来可以说什么」：整句可复制（老侧三个操作按钮的 prompt 位）。 */
function nextSteps(date: string, record: ScheduleRecord): string {
  const lines = [
    '请帮我接着 ' + date + ' 的 ' + record.time_end + ' 之后记下一条作息。',
    '请帮我看看 ' + date + ' 这一天的全貌。',
    '请帮我复盘 ' + date + ' 这一天。',
  ];
  const labels = ['继续记下一条', '看今日全貌', '晚点复盘'];
  const blocks = lines.map((command, i) => renderPreBlock({
    label: labels[i],
    command,
    actionId: 'ilife-sch-write-next-' + String(i + 1),
    copyLabel: '复制这句话',
  })).join('');
  return renderDisclosure({ title: '接下来可以说什么', contentHtml: blocks });
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
    { label: '今日已记录', value: String(view.total) + ' 块', detail: date },
    {
      label: '覆盖时长', value: fmtDurShort(view.coverage),
      detail: '已过 ' + fmtDurShort(passed) + '，覆盖 ' + coveragePct + '%',
      bar: { pct: Math.round(coveragePct) },
    },
    {
      label: '缺口时段', value: String(gaps.length) + ' 段',
      detail: gaps.length === 0
        ? '整天都记满了'
        : ('合计 ' + String(gaps.reduce((sum, g) => sum + gapMinutes(g), 0)) + ' 分钟'),
    },
    { label: '本周累计', value: String(week.length) + ' 块', detail: '最近 7 天' },
  ];
  const head: PageHead = {
    docTitle: '作息管家 记作息结果',
    eyebrow: EYEBROW,
    title: '记作息结果',
    subtitle: '刚写入的是 ' + date + ' 的 ' + span(record.time_start, record.time_end)
      + '，活动是「' + record.activity + '」，分类是「' + record.category + '」。',
  };
  const content = [
    level2 === null ? l1OnlyNotice(level1) : '',
    renderConclusionBar('已记下这一条，' + date + ' 一共 ' + view.total + ' 块记录，健康分 ' + view.score + '。'),
    renderKpiGrid(kpis, { title: '当前状态总览' }),
    renderHourBand(cellsOf(records), { order: orderOf(), title: '全天作息时间轴', height: 140 }),
    renderFactStrip({
      items: [
        { label: '回溯窗口', value: span(hhmm(windowStart), record.time_end) },
        { label: '刚记录', value: span(record.time_start, record.time_end) },
        { label: '本类已有', value: String(sameCategory) + ' 块' },
        { label: '本类占比', value: fmtPct(record.duration_minutes ?? 0, view.coverage) + '%' },
      ],
    }),
    renderPastHours({
      title: '过去几小时推断回溯',
      cards,
      emptyText: '回溯窗口里还没有别的记录，这是窗口里的第一笔。',
    }),
    nextSteps(date, record),
    renderCopyBlock({
      title: '复制与留档',
      ...copyOf('记作息结果', [
        '日期：' + date,
        '这一条：' + span(record.time_start, record.time_end) + ' ' + record.activity,
        '分类：' + record.category,
        '今日块数：' + view.total + '，覆盖：' + fmtDur(view.coverage) + '，健康分：' + view.score,
      ]),
      dataActionId: 'ilife-sch-write-copy-data',
      logActionId: 'ilife-sch-write-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: writePartsCss() });
}

/* ─────────────────────────── ② 修正作息回执（老侧 f09） ─────────────────────────── */

/** 一个字段改前改后长什么样（时长补单位、空值写破折号）。 */
function fieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'duration_minutes') return String(value) + ' 分钟';
  return String(value);
}

/** 「修正作息回执」整页：蓝调 diff ＋ 多字段前后对照 ＋ 这条记录现在的样子。 */
export function amendReceiptPage(
  before: ScheduleRecord, after: ScheduleRecord, patchKeys: readonly string[], now: Date = new Date(),
): string {
  const rows: ChangeRowInput[] = patchKeys
    .filter((key) => FIELD_LABELS[key] !== undefined)
    .map((key) => ({
      label: FIELD_LABELS[key],
      before: fieldValue(key, (before as unknown as Record<string, unknown>)[key]),
      after: fieldValue(key, (after as unknown as Record<string, unknown>)[key]),
    }));
  const older = after.date < isoOf(now);
  const stale = older
    ? renderFeedbackBlock({
      title: '改的是一条旧记录',
      toast: {
        icon: 'warn',
        msg: '这条记的是 ' + after.date + '，不是今天的。改动照样写进库，次数也照样加一。',
      },
      staticNotice: true,
    })
    : '';
  const current: DataTableRow[] = [
    { k: '日期', v: after.date },
    { k: '起止', v: span(after.time_start, after.time_end) },
    { k: '时长', v: fmtDur(after.duration_minutes ?? 0) },
    { k: '活动', v: after.activity },
    { k: '分类', v: after.category },
    { k: '来源消息', v: fieldValue('source_contents', after.source_contents) },
    { k: '来源时间', v: fieldValue('source_timestamps', after.source_timestamps) },
    { k: '推理说明', v: fieldValue('analysis_reasoning', after.analysis_reasoning) },
  ];
  const head: PageHead = {
    docTitle: '作息管家 修正作息回执',
    eyebrow: EYEBROW,
    title: '修正作息回执',
    subtitle: '这条记录改过 ' + after.edit_count + ' 次，这次动的是 ' + after.date
      + ' 的 ' + span(after.time_start, after.time_end) + '。',
  };
  const content = [
    stale,
    renderConclusionBar('这条记录已经改好，改的是哪几格，原来是什么值，下面逐格对照。'),
    renderKpiGrid([
      { label: '记录日期', value: after.date, detail: span(after.time_start, after.time_end) },
      { label: '修改次数', value: '第 ' + after.edit_count + ' 次', detail: '库里这条被改过几次' },
      { label: '现在的分类', value: after.category, detail: '一级 ' + l1Of(after.category) },
      { label: '现在的活动', value: after.activity, detail: fmtDur(after.duration_minutes ?? 0) },
    ], { title: '这条记录现在的样子' }),
    renderDiffPanel({ title: '这次改了什么', rows }),
    renderDisclosure({
      title: '改完之后的完整一条',
      contentHtml: renderDataTable({
        columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
        rows: current,
      }),
    }),
    renderCaliberLine('改前那一格画着删除线，改后那一格是新值 ｜ 时长按时段实算，跟起止对得上'),
    renderCopyBlock({
      title: '复制与留档',
      ...copyOf('修正作息回执', [
        '日期：' + after.date,
        '这次改了 ' + String(rows.length) + ' 处：' + rows.map((r) => r.label).join('，'),
        '现在的分类：' + after.category,
        '现在的活动：' + after.activity,
        '修改次数：' + after.edit_count,
      ]),
      dataActionId: 'ilife-sch-write-copy-data',
      logActionId: 'ilife-sch-write-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: writePartsCss() });
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
    docTitle: '作息管家 批量导入回执',
    eyebrow: EYEBROW,
    title: '批量导入回执',
    subtitle: '导入的是 ' + input.date + ' 的记录，一共收到 ' + total + ' 条，写入 ' + done + ' 条。',
  };
  const content = [
    failed === 0 ? '' : renderFeedbackBlock({
      title: '有几条没写进去',
      toast: {
        icon: 'warn',
        msg: '没通过的 ' + failed + ' 条没有写进库，改好之后可以再导一次。',
      },
      staticNotice: true,
    }),
    renderConclusionBar(failed === 0
      ? '这次收到 ' + total + ' 条，全都写进库了。'
      : '这次收到 ' + total + ' 条，写进 ' + done + ' 条，另有 ' + failed + ' 条没通过校验。'),
    renderKpiGrid([
      { label: '收到条数', value: String(total) + ' 条', detail: input.date },
      { label: '写入成功', value: String(done) + ' 条', detail: '已进作息记录' },
      { label: '没通过', value: String(failed) + ' 条', detail: failed === 0 ? '一条不差' : '没有写进库' },
      {
        label: '写入进度', value: String(total === 0 ? 0 : Math.round((done / total) * 100)) + '%',
        detail: String(done) + ' ／ ' + String(total),
      },
    ], { title: '这一趟的结果' }),
    renderDataTable({
      caption: '逐条结果',
      columns: [
        { key: 'n', label: '第几条' },
        { key: 'time', label: '时段' },
        { key: 'activity', label: '活动' },
        { key: 'category', label: '分类' },
        { key: 'result', label: '结果' },
      ],
      rows: tableRows,
      emptyText: '这一趟一条也没收到',
    }),
    left <= 0 ? '' : renderCaliberLine('另有 ' + left + ' 条没有摆上来，完整清单在复制出去的数据里'),
    renderCopyBlock({
      title: '复制与留档',
      ...copyOf('批量导入回执', [
        '日期：' + input.date,
        '收到：' + total + ' 条，写入：' + done + ' 条，没通过：' + failed + ' 条',
        ...input.rows.map((r) => '第 ' + r.seq + ' 条：' + r.time + ' ' + r.activity + ' ' + r.result),
      ]),
      dataActionId: 'ilife-sch-write-copy-data',
      logActionId: 'ilife-sch-write-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: writePartsCss() });
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
    docTitle: '作息管家 写作息摘要回执',
    eyebrow: EYEBROW,
    title: '写作息摘要回执',
    subtitle: '写的是 ' + summary.date + ' 的「' + summary.category + '」摘要，一共 '
      + fmtDur(summary.totalMinutes) + '。',
  };
  const content = [
    renderConclusionBar('这一条摘要已经写进库：' + summary.date + ' 的「' + summary.category + '」记作 '
      + fmtDur(summary.totalMinutes) + '。'),
    renderKpiGrid([
      { label: '摘要日期', value: summary.date, detail: '写进每日摘要' },
      { label: '一级分类', value: summary.category, detail: '八类之一' },
      { label: '写入时长', value: fmtDur(summary.totalMinutes), detail: '这一次写的值' },
      { label: '当天记录', value: String(inLevel1.length) + ' 块', detail: '同一天同一支' },
    ], { title: '这次写了什么' }),
    renderFactStrip({
      items: [
        { label: '当天这支记录合计', value: fmtDur(level1Minutes) },
        { label: '当天全部记录合计', value: fmtDur(dayMinutes) },
        { label: '这支占当天', value: fmtPct(level1Minutes, dayMinutes) + '%' },
      ],
    }),
    renderCaliberLine('摘要与记录是两支账 ｜ 摘要按天按一级分类各存一行，记录表照原样留着'),
    renderCopyBlock({
      title: '复制与留档',
      ...copyOf('写作息摘要回执', [
        '日期：' + summary.date,
        '一级分类：' + summary.category,
        '写入时长：' + fmtDur(summary.totalMinutes),
        '当天这支记录合计：' + fmtDur(level1Minutes),
      ]),
      dataActionId: 'ilife-sch-write-copy-data',
      logActionId: 'ilife-sch-write-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: writePartsCss() });
}
