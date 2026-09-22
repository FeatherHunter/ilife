/** #788 · 飞书两条唤醒词的**两张页**：能力探测（只读）与日程管家同步（回执）。
 *
 *  为什么两张分开（照老侧的分工，也与 #787 的接缝对上）：
 *    · 「飞书探测」（`op=sync` ＋ `dryRun`）——**先看**：三档能力门探一遍，一门写都不发；
 *    · 「日程管家同步」（`op=sync`）——**执行**：回填标识、补齐远端、清孤儿，然后把这一趟做了什么
 *      分格报出来。老侧那种「写之前先问一句」的交互，落在这两张页的分工上：要问就先跑探测，
 *      要写就说同步（#787 的证据件把这一问划给了本票）。
 *
 *  **页上文案纪律**：不出现命令键、库列名、参数名、票号与远端对象标识（那一串是内部标识，只进回执，
 *  不进页）；并列关系用读数卡与表格表达，不拿 `·`／`；`／`｜`／`、`／`~` 顶替。
 */
import {
  renderCaliberLine, renderConclusionBar, renderDataTable, renderFeedbackBlock,
  renderKpiGrid, renderListRows, renderPreBlock, type DataTableRow, type KpiCardInput,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import type { PlanEvent, ScheduleDb } from '../fetch/db.js';
import { listPlanEvents } from '../fetch/index.js';
import { fmtDurShort, l1Of } from '../policy/index.js';
import { scheduleCopyArea } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { minutesOfDayEnd } from './planDocs.js';
import { planPartsCss, renderSectionTitle } from './planParts.js';
import { REMOTE_LABEL, planCopyArea, type RemoteState } from './receipt.js';
import { TIER_CN, TIER_NEXT, TIER_VALUE, type TierReport } from './probe.js';

const EYEBROW = '作息管家 日程与计划';

/** 外部来的原话（命令行 stderr、回执 message、错误串）上屏前过分隔符门（#516）：
 *  页自己的文案本来就照纪律写，这几处是**别的进程吐出来的字**——真让它把 `／`／`、` 带上屏，
 *  就是设计债进门。做法是把那几种并列符号换成行文逗号，只动上屏这一份，回执载荷一字不改。 */
function plain(text: string): string {
  return text
    .replace(/[·；;｜|／/、＋~～]/g, '，')
    .replace(/，{2,}/g, '，')
    .replace(/，([）)】」])/g, '$1');
}

/** 同步回执的分格（`runSync` 的 `counts`）在页上的名字与读法，一处定义。 */
const COUNT_LABELS: readonly { readonly key: string; readonly label: string; readonly hint: string }[] = [
  { key: 'backfilled', label: '回填标识', hint: '远端本来就有但本地缺标识的，这一趟认回来的' },
  { key: 'created', label: '远端新建', hint: '本地有但远端没有，这一趟补上去的' },
  { key: 'updated', label: '远端改动', hint: '两边标题或备注不一样，按本地那一条改过去的' },
  { key: 'timeSynced', label: '时段回写', hint: '你在飞书里改过时段，尊重你，把它写回本地的' },
  { key: 'deleted', label: '远端清理', hint: '孤儿与同槽冗余，这一趟清掉的' },
  { key: 'pastSkipped', label: '过去日期跳过', hint: '昨天以前的计划不补建，免得死灰复燃' },
  { key: 'duplicates', label: '同槽冗余', hint: '同一时段里历史留下的重复对象' },
  { key: 'failed', label: '失败', hint: '这一趟没成的那几件' },
];

function eventRows(events: readonly PlanEvent[]): DataTableRow[] {
  return events.map((p) => ({
    time: p.time_start + ' 至 ' + p.time_end,
    title: p.title,
    category: l1Of(p.category ?? ''),
    remote: p.feishu_event_id === null ? '没同步过' : '已同步飞书',
  }));
}

function localCounts(handle: ScheduleDb, date: string): { total: number; synced: number; minutes: number } {
  const events = listPlanEvents(handle, date);
  return {
    total: events.length,
    synced: events.filter((p) => p.feishu_event_id !== null).length,
    minutes: events.reduce((sum, p) => sum + Math.max(0, minutesOfDayEnd(p.time_end) - minutesOfDayEnd(p.time_start)), 0),
  };
}

/* ─────────────────────── ① 飞书探测（只读，三档） ─────────────────────── */

/** 「飞书探测」整页：三档结论 ＋ 下一步 ＋ 本地这一天的账（**这一趟没写任何对象**）。 */
export function probePage(handle: ScheduleDb, date: string, report: TierReport): string {
  const local = localCounts(handle, date);
  const kpis: readonly KpiCardInput[] = [
    { label: '能力档位', value: TIER_VALUE[report.tier], detail: plain(report.why) },
    { label: '这一天本地计划', value: String(local.total), unit: '条', detail: '共 ' + fmtDurShort(local.minutes) },
    { label: '带远端标识的', value: String(local.synced), unit: '条', detail: '同步过的那些' },
    {
      label: '这一趟写了几笔',
      value: '0',
      detail: '只读探测，远端一行没动',
      // 三档全通时给满，其余档按三门过了几门给（读数同源：探测结果那一份）。
      bar: { pct: Math.round(([report.cliPath === null ? 0 : 1, report.openId === null ? 0 : 1, report.calendar ? 1 : 0]
        .reduce((a, b) => a + b, 0) / 3) * 100) },
    },
  ];
  const head: PageHead = {
    docTitle: '作息管家 飞书探测',
    eyebrow: EYEBROW,
    title: '飞书探测',
    subtitle: '看本机的飞书能力到哪一档，以及 ' + date + ' 这一天本地排了什么。这一步只读，不写任何对象。',
  };
  const steps: readonly DataTableRow[] = [
    { step: '装有命令行', state: report.cliPath === null ? '没找到' : '在场', why: report.cliPath === null ? '家目录与查找路径里都没有' : '找到了可执行文件' },
    { step: '授权登录过', state: report.openId === null ? '没过' : '过了', why: report.openId === null ? '终端里查不到登录身份' : '查到了登录身份' },
    { step: '日历拉得动', state: report.calendar ? '拉得动' : '拉不动', why: report.calendar ? '今日议程这一问有回应' : '今日议程那一问没成' },
  ];
  const content = [
    renderKpiGrid(kpis, { title: '这一趟探测的结论' }),
    renderConclusionBar('飞书能力：' + TIER_CN[report.tier] + '。' + plain(report.why)
      + '。要动远端就说「日程管家同步」，要留个只读的快照就是这一页。'),
    renderSectionTitle('三道门逐道看'),
    renderDataTable({
      columns: [
        { key: 'step', label: '探什么' },
        { key: 'state', label: '结果' },
        { key: 'why', label: '怎么看出来的' },
      ],
      rows: steps,
    }),
    renderFactStrip({
      items: [
        { label: '命令行版本', value: report.version === null ? '没装' : report.version.replace(/^lark-cli\s*/i, '') },
        { label: '探测日期', value: date },
        { label: '本地这一天的计划', value: String(local.total) + ' 条' },
        { label: '远端这一趟', value: '没碰' },
      ],
    }),
    renderSectionTitle('下一步怎么走'),
    renderListRows({
      items: TIER_NEXT[report.tier].map((text) => ({ main: text })),
      emptyText: '没有下一步',
    }),
    renderSectionTitle('本地这一天的账'),
    '<p class="sch-pl-note">这一份读的是本地库：这一天排了几条计划，其中几条已经带上远端标识。远端那一边这一趟没拉，故不报对方的条数。</p>',
    renderDataTable({
      columns: [
        { key: 'time', label: '时段' },
        { key: 'title', label: '计划' },
        { key: 'category', label: '分类' },
        { key: 'remote', label: '远端标识' },
      ],
      rows: eventRows(listPlanEvents(handle, date)),
      emptyText: '这一天本地没有计划',
    }),
    renderCaliberLine('探测只读，三道门都只问不写，本地库这一趟也没动过'),
    renderPreBlock({
      label: '要真同步就说这一句',
      command: '同步 ' + date + ' 的日程到飞书',
      actionId: 'ilife-sch-probe-copy-next',
      copyLabel: '复制这句话',
    }),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-probe-copy-data',
      logActionId: 'ilife-sch-probe-copy-log',
      ...planCopyArea({
        message: '飞书探测：日期 ' + date + '，档位 ' + TIER_CN[report.tier] + '，原因 ' + report.why
          + '，本地这一天计划 ' + String(local.total) + ' 条、带远端标识 ' + String(local.synced) + ' 条，这一趟写入 0 笔',
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"sync","dryRun":true,"date":"' + date + '"}',
        source: '本机命令行探测与本地日程计划表',
      }),
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: planPartsCss() });
}

/* ─────────────────────── ② 日程管家同步（回执） ─────────────────────── */

export interface SyncPayload {
  readonly message: string;
  readonly remote: RemoteState;
  readonly counts: Record<string, number>;
  readonly notes: readonly string[];
  readonly errors: readonly string[];
}

/** 这一趟的结论（页自己的句子，不照抄回执那一串以并列符号分隔的计数）：
 *  远端在场就报对齐结果，远端没成/跳过也照实说，失败数单独点名。 */
function syncConclusion(payload: SyncPayload): string {
  const c = payload.counts;
  const moved = (c.backfilled ?? 0) + (c.created ?? 0) + (c.updated ?? 0) + (c.timeSynced ?? 0) + (c.deleted ?? 0);
  const head = payload.remote === 'unavailable'
    ? '这一趟远端没成，本地那边没有改动。'
    : (moved === 0 ? '两边本来就是对得上，这一趟没有要动的东西。' : '这一趟一共动了 ' + String(moved) + ' 处。');
  const parts = [
    '回填标识 ' + String(c.backfilled ?? 0) + ' 笔',
    '远端新建 ' + String(c.created ?? 0) + ' 笔',
    '远端改动 ' + String(c.updated ?? 0) + ' 笔',
    '时段回写 ' + String(c.timeSynced ?? 0) + ' 笔',
    '远端清理 ' + String(c.deleted ?? 0) + ' 笔',
  ].join('，');
  const tail = (c.failed ?? 0) === 0
    ? '失败 0 笔。'
    : '失败 ' + String(c.failed ?? 0) + ' 笔，逐条在下面。';
  return head + parts + '。' + tail;
}

/** 「日程管家同步」整页：这一趟做了什么分格报出来，没成的逐条点名。 */
export function syncPage(handle: ScheduleDb, date: string, payload: SyncPayload): string {
  const events = listPlanEvents(handle, date);
  const failed = payload.counts.failed ?? 0;
  const kpis: readonly KpiCardInput[] = COUNT_LABELS.map((c) => ({
    label: c.label,
    value: String(payload.counts[c.key] ?? 0),
    unit: '笔',
    detail: c.hint,
  }));
  const content = [
    renderKpiGrid(kpis, { title: '这一趟的账' }),
    renderConclusionBar(syncConclusion(payload)),
    renderFactStrip({
      items: [
        { label: '同步的日期', value: date },
        { label: '远端侧', value: REMOTE_LABEL[payload.remote] },
        { label: '本地这一天的计划', value: String(events.length) + ' 条' },
        { label: '没成的', value: String(failed) + ' 笔' },
      ],
    }),
    renderFeedbackBlock({
      title: '这一趟的结果',
      toast: failed === 0
        ? { icon: payload.remote === 'unavailable' ? 'warn' : 'ok', msg: plain(payload.message) }
        : { icon: 'danger', msg: plain(payload.message), lines: payload.errors.map(plain) },
      staticNotice: true,
    }),
    ...(payload.notes.length === 0 ? [] : [renderSectionTitle('顺带记下的'),
      renderListRows({ items: payload.notes.map((text) => ({ main: plain(text) })), emptyText: '没有顺带记下的' })]),
    ...(payload.errors.length === 0 ? [] : [renderSectionTitle('没成的逐条名单'),
      renderListRows({ items: payload.errors.map((text) => ({ main: plain(text) })), emptyText: '没有没成的' })]),
    renderSectionTitle('本地这一天的排布'),
    renderCaliberLine('远端只动带归属标记的对象，你在飞书日历上自己加的那些一律不碰'),
    renderDataTable({
      columns: [
        { key: 'time', label: '时段' },
        { key: 'title', label: '计划' },
        { key: 'category', label: '分类' },
        { key: 'remote', label: '远端标识' },
      ],
      rows: eventRows(events),
      emptyText: '这一天本地没有计划',
    }),
    renderSectionTitle('下一步'),
    renderListRows({
      items: [
        { main: '要看另一天的差异，把日期一并说清楚，比如「同步 2026-09-22 的日程」。' },
        { main: '只想先看一眼而不动远端，就说「飞书探测」，那一页只读。' },
      ],
      emptyText: '没有下一步',
    }),
    renderPreBlock({
      label: '再同步一天就说这一句',
      command: '同步 ' + date + ' 的日程到飞书',
      actionId: 'ilife-sch-sync-copy-next',
      copyLabel: '复制这句话',
    }),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-sync-copy-data',
      logActionId: 'ilife-sch-sync-copy-log',
      ...planCopyArea({
        message: '日程管家同步：日期 ' + date + '，' + payload.message + '，'
          + COUNT_LABELS.map((c) => c.label + ' ' + String(payload.counts[c.key] ?? 0) + ' 笔').join('，')
          + (payload.errors.length === 0 ? '' : '，没成的 ' + payload.errors.join('，')),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"sync","date":"' + date + '"}',
        source: '本地日程计划表与飞书日历',
        ok: payload.errors.length === 0,
      }),
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({
    head: {
      docTitle: '作息管家 日程管家同步',
      eyebrow: EYEBROW,
      title: '日程管家同步',
      subtitle: date + ' 这一天本地与飞书对了一遍，这一页报的是这一趟真做了什么。',
    },
    content,
    extraCss: planPartsCss(),
  });
}
