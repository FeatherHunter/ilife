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
 */
import {
  renderCaliberLine, renderConclusionBar, renderDataTable, renderDisclosure,
  renderFeedbackBlock, renderKpiGrid, type ChangeRowInput, type DataTableRow,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import type { PlanEvent, ScheduleDb } from '../fetch/db.js';
import { listPlanEvents } from '../fetch/index.js';
import { fmtDur, fmtDurShort, l1Of, toMinutes, LEVEL1_WHITELIST } from '../policy/index.js';
import { scheduleCopyArea } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { hourCellsOf, renderHourBand } from '../shared/pageParts.js';
import { REMOTE_LABEL, planCopyArea, type RemoteState } from './receipt.js';
import { planPartsCss, renderChangePanel } from './planParts.js';

/** 域词（页眉那一行）。 */
const EYEBROW = '作息管家 日程与计划';
/** 一级分类的权威顺序（色带配色与图例都照它），定义只此一处：`policy` 的白名单。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];

/** 回执页上的字段中文名（库列名与命令参数名都不上屏；一处定义）。 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  date: '日期',
  time_start: '开始时间',
  time_end: '结束时间',
  title: '标题',
  notes: '备注',
  category: '分类',
  completion: '完成状态',
  completion_note: '完成说明',
};

const span = (start: string, end: string): string => start + ' 至 ' + end;
const empty = (v: unknown): string => (v === null || v === undefined || v === '' ? '—' : String(v));

/** 事件行在页上的分类写法：没标分类的那一条写「未分类」（不印空串）。 */
const categoryOf = (e: PlanEvent): string => (e.category === null || e.category === '' ? '未分类' : e.category);

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
    title: '这一步没有新建',
    toast: {
      icon: 'info',
      msg: '这个日期配这一段起止本来就有一条了，补计划认了原来那条，没有重复建。回执里的编号还是它。',
    },
    staticNotice: true,
  });
  const head: PageHead = {
    docTitle: '作息管家 补计划回执',
    eyebrow: EYEBROW,
    title: '补计划回执',
    subtitle: event === undefined
      ? r.date + ' 这一条没有在库里找到，先把这一趟的读数摆出来。'
      : '补的是 ' + r.date + ' 的 ' + span(event.time_start, event.time_end) + '，标题是「' + event.title + '」。',
  };
  const current: DataTableRow[] = event === undefined ? [] : [
    { k: '编号', v: String(event.id) },
    { k: '日期', v: event.date },
    { k: '时段', v: span(event.time_start, event.time_end) },
    { k: '时长', v: fmtDur(minutes) },
    { k: '标题', v: event.title },
    { k: '分类', v: categoryOf(event) },
    { k: '备注', v: empty(event.notes) },
    { k: '完成状态', v: empty(event.completion) },
  ];
  const content = [
    r.created ? '' : hit,
    renderConclusionBar(r.created
      ? '已经补上 ' + r.date + ' 的 ' + (event === undefined ? '这一条' : span(event.time_start, event.time_end))
        + '，这一天现在排了 ' + day.length + ' 件。'
      : '这一天本来就有这一段，这一步没有新建，' + r.date + ' 现在排了 ' + day.length + ' 件。'),
    renderKpiGrid([
      { label: '事件编号', value: String(r.id), detail: r.date },
      {
        label: '本地这一半', value: r.created ? '新建' : '原有',
        detail: r.created ? '这条是新写进去的' : '命中已有那条，没有重复建',
      },
      { label: '时段', value: event === undefined ? '—' : fmtDurShort(minutes), detail: event === undefined ? '—' : span(event.time_start, event.time_end) },
      { label: '这一天', value: String(day.length) + ' 件', detail: '同一分类 ' + String(sameCategory) + ' 件' },
    ], { title: '这一趟的结果' }),
    renderChangePanel({ title: '这一条的前后', rows: [
      { label: '库里有没有', before: r.created ? '没有' : '已经有了', after: '有这一条' },
      { label: '事件编号', before: r.created ? '—' : String(r.id), after: String(r.id), arrow: false },
    ] }),
    renderFactStrip({
      items: [
        { label: '远端侧', value: REMOTE_LABEL[r.remote] },
        { label: '这一天现有', value: String(day.length) + ' 件' },
        { label: '同分类', value: String(sameCategory) + ' 件' },
        { label: '完成状态', value: event === undefined ? '—' : empty(event.completion) },
      ],
    }),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: '补计划回执：日期 ' + r.date + '，事件编号 ' + String(r.id) + '，时段 '
          + (event === undefined ? '—' : span(event.time_start, event.time_end)) + '，本地这一半 '
          + (r.created ? '新建' : '命中已有') + '，远端侧 ' + REMOTE_LABEL[r.remote],
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"ensure","date":"' + r.date + '"}',
        source: '日程计划表（' + r.date + ' 现有 ' + String(day.length) + ' 件）',
      }),
    }),
    renderDisclosure({
      title: '这一条现在的样子',
      contentHtml: renderDataTable({
        caption: '库里这一条',
        columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
        rows: current,
        emptyText: '库里没有找到这一条',
      }),
    }),
    event === undefined ? '' : renderHourBand(cellsOf(day), {
      order: L1_ORDER, title: r.date + ' 这一天现在的排布', height: 120,
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: planPartsCss() });
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
      result: d.created ? '新建' : '命中已有',
      remote: REMOTE_LABEL[d.remote],
    };
  });
  const head: PageHead = {
    docTitle: '作息管家 补计划回执',
    eyebrow: EYEBROW,
    title: '批量补计划回执',
    subtitle: '补的是 ' + (sorted.length === 0 ? '一个日期也没给' : sorted[0] + ' 至 ' + sorted[sorted.length - 1])
      + '，一共 ' + days.length + ' 天。',
  };
  const content = [
    renderConclusionBar(failed === 0
      ? '这次 ' + days.length + ' 天都补上了，新建 ' + created + ' 天，命中已有 ' + found + ' 天。'
      : '这次 ' + days.length + ' 天里 ' + failed + ' 天的远端侧没成，本地那一半照写。'),
    renderKpiGrid([
      { label: '天数', value: String(days.length) + ' 天', detail: '这一趟补的' },
      { label: '新建', value: String(created) + ' 天', detail: '本地原来没有这一段' },
      { label: '命中已有', value: String(found) + ' 天', detail: '同一天同一段起止已存在' },
      { label: '远端侧没成', value: String(failed) + ' 天', detail: failed === 0 ? '一天不差' : '本地那一半照写' },
    ], { title: '这一趟的结果' }),
    renderDataTable({
      caption: '逐天结果',
      columns: [
        { key: 'date', label: '日期' },
        { key: 'time', label: '时段' },
        { key: 'title', label: '标题' },
        { key: 'result', label: '本地这一半' },
        { key: 'remote', label: '远端侧' },
      ],
      rows: tables,
      emptyText: '这一趟一天也没收到',
    }),
    renderCaliberLine('同一天同一段起止只留一条 ｜ 再补一次不算新建，也不会重复'),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: '批量补计划回执：' + String(days.length) + ' 天，'
          + days.map((d) => d.date + ' ' + (d.created ? '新建' : '命中已有') + ' ' + REMOTE_LABEL[d.remote]).join('，'),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"ensure","dates":['
          + days.map((d) => '"' + d.date + '"').join(',') + ']}',
        source: '日程计划表（' + String(days.length) + ' 天）',
      }),
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: planPartsCss() });
}

/* ─────────────────────────── ② 改计划回执（老侧 f14） ─────────────────────────── */

function fieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

/** 「改计划回执」整页：字段前后对照 ＋ 飞书询问位 ＋ 这条现在长什么样。 */
export function updateReceiptPage(
  handle: ScheduleDb, before: PlanEvent, after: PlanEvent, patchKeys: readonly string[], remote: RemoteState,
): string {
  const rows: ChangeRowInput[] = patchKeys
    .filter((key) => FIELD_LABELS[key] !== undefined)
    .map((key) => ({
      label: FIELD_LABELS[key],
      before: fieldValue(key, (before as unknown as Record<string, unknown>)[key]),
      after: fieldValue(key, (after as unknown as Record<string, unknown>)[key]),
    }));
  const moved = before.time_start !== after.time_start || before.time_end !== after.time_end;
  const day = listPlanEvents(handle, after.date);
  const head: PageHead = {
    docTitle: '作息管家 改计划回执',
    eyebrow: EYEBROW,
    title: '改计划回执',
    subtitle: '改的是 ' + after.date + ' 的 ' + span(before.time_start, before.time_end)
      + '，改完是 ' + span(after.time_start, after.time_end) + '。',
  };
  const content = [
    renderConclusionBar(moved
      ? '这一条已经改好，时段挪到了 ' + span(after.time_start, after.time_end) + '，改的是哪几格下面逐格对照。'
      : '这一条已经改好，时段没动，改的是哪几格下面逐格对照。'),
    renderKpiGrid([
      { label: '事件编号', value: String(after.id), detail: after.date },
      { label: '现在的时段', value: fmtDurShort(toMinutes(after.time_end) - toMinutes(after.time_start)), detail: span(after.time_start, after.time_end) },
      { label: '改动处数', value: String(rows.length) + ' 处', detail: moved ? '其中时段也变了' : '时段没动' },
      { label: '这一天', value: String(day.length) + ' 件', detail: '改完之后的排布' },
    ], { title: '这一趟的结果' }),
    renderChangePanel({ title: '这次改了什么', rows }),
    moved
      ? renderFeedbackBlock({
        title: '时段变了，飞书那条也换过',
        toast: {
          icon: 'warn',
          msg: '远端日历没有「改时间」这个动作，所以这一趟是先按新时段建一条，建好之后把旧的那条删掉。两步都成了才算远端侧成功。',
        },
        staticNotice: true,
      })
      : '',
    renderFactStrip({
      items: [
        { label: '远端侧', value: REMOTE_LABEL[remote] },
        { label: '现在的标题', value: after.title },
        { label: '现在的分类', value: categoryOf(after) },
        { label: '完成状态', value: empty(after.completion) },
      ],
    }),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: '改计划回执：日期 ' + after.date + '，事件编号 ' + String(after.id) + '，这次改了 '
          + String(rows.length) + ' 处（' + rows.map((r) => r.label).join('，') + '），现在的时段 '
          + span(after.time_start, after.time_end) + '，远端侧 ' + REMOTE_LABEL[remote],
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"update","id":' + String(after.id) + '}',
        source: '日程计划表（' + after.date + ' 现有 ' + String(day.length) + ' 件）',
      }),
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: planPartsCss() });
}

/* ─────────────────────────── ③ 删计划回执（老侧 f14 同一家族） ─────────────────────────── */

/** 「删计划回执」整页：软删的对照 ＋ 飞书询问位 ＋ 这一次删掉的是哪一条。 */
export function deactivateReceiptPage(handle: ScheduleDb, before: PlanEvent, remote: RemoteState): string {
  const day = listPlanEvents(handle, before.date);
  const minutes = toMinutes(before.time_end) - toMinutes(before.time_start);
  const head: PageHead = {
    docTitle: '作息管家 删计划回执',
    eyebrow: EYEBROW,
    title: '删计划回执',
    subtitle: '删的是 ' + before.date + ' 的 ' + span(before.time_start, before.time_end) + '，标题是「' + before.title + '」。',
  };
  const content = [
    renderConclusionBar('这一条已经不再算进 ' + before.date + ' 了，这一天现在排着 ' + day.length
      + ' 件。库里那一条没有真的删掉，只是标记成不再算。'),
    renderKpiGrid([
      { label: '事件编号', value: String(before.id), detail: before.date },
      { label: '删掉的时段', value: fmtDurShort(minutes), detail: span(before.time_start, before.time_end) },
      { label: '这一天', value: String(day.length) + ' 件', detail: '比删之前少一件' },
      { label: '本地这一半', value: '不再算', detail: '标记成不活跃' },
    ], { title: '这一趟的结果' }),
    renderChangePanel({ title: '这一条的前后', rows: [
      { label: '这一条', before: '在排', after: '不再算' },
      { label: '这一天在排的件数', before: String(day.length + 1) + ' 件', after: String(day.length) + ' 件' },
      { label: '远端那条', before: before.feishu_event_id === null ? '没有' : '有', after: before.feishu_event_id === null ? '没有' : '按这一趟的结果处理' },
    ] }),
    renderFeedbackBlock({
      title: '这是软删，不是抹掉',
      toast: {
        icon: 'info',
        msg: '库里那一条还在，只是不再算进这一天的排布。同槽位上属于本技能的远端对象一并清掉，别的对象不动。',
      },
      staticNotice: true,
    }),
    renderFactStrip({
      items: [
        { label: '远端侧', value: REMOTE_LABEL[remote] },
        { label: '原来的标题', value: before.title },
        { label: '原来的分类', value: categoryOf(before) },
        { label: '完成状态', value: empty(before.completion) },
      ],
    }),
    renderCaliberLine('删计划只动这一条 ｜ 别的事件与别的日期一件不动'),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...planCopyArea({
        message: '删计划回执：日期 ' + before.date + '，事件编号 ' + String(before.id) + '，删掉的时段 '
          + span(before.time_start, before.time_end) + '，这一天现在 ' + String(day.length) + ' 件，远端侧 '
          + REMOTE_LABEL[remote],
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"deactivate","id":' + String(before.id) + '}',
        source: '日程计划表（' + before.date + ' 现有 ' + String(day.length) + ' 件）',
      }),
    }),
    renderHourBand(cellsOf(day), { order: L1_ORDER, title: before.date + ' 这一天现在的排布', height: 120 }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: planPartsCss() });
}
