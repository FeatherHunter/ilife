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
import { listPlanEvents, shortLarkVersion } from '../fetch/index.js';
import { fmtDurShort, l1Of } from '../policy/index.js';
import { scheduleCopyArea } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { pageSections } from '../shared/pageNav.js';
import { minutesOfDayEnd } from './planDocs.js';
import { planPartsCss, renderSectionTitle } from './planParts.js';
import { remoteLabelOf, planCopyArea, type RemoteState } from './receipt.js';
import { tierCnOf, tierNextOf, tierValueOf, type TierReport } from './probe.js';
import { m } from '../entries/index.js';

/** 页眉（品牌＋域）。#1197：改成函数——`m()` 只在渲染期取词，模块级常量的初值会定死语言。 */
const eyebrowOf = (): string => m('skill-schedule.plan-feishuDocs.c001');

/** 外部来的原话（命令行 stderr、回执 message、错误串）上屏前过分隔符门（#516）：
 *  页自己的文案本来就照纪律写，这几处是**别的进程吐出来的字**——真让它把 `／`／`、` 带上屏，
 *  就是设计债进门。做法是把那几种并列符号换成行文逗号，只动上屏这一份，回执载荷一字不改。 */
function plain(text: string): string {
  return text
    .replace(/[·；;｜|／/、＋~～]/g, '，')
    .replace(/，{2,}/g, '，')
    .replace(/，([）)】」])/g, '$1');
}

/** 事实条「命令行版本」只印数字（口径唯一定义地是 `fetch` 门的 `shortLarkVersion`）。
 *  `null`（没装）印「没装」，`unknown`／无数字印「读不到」。 */

/** 同步回执的分格（`runSync` 的 `counts`）在页上的名字与读法，一处定义。
 *  #1197：由模块级常量表改成函数——常量初值在模块加载期就定死语言了，取词要落在页函数里（§4.8）。 */
function countLabels(): readonly { readonly key: string; readonly label: string; readonly hint: string }[] {
  return [
  { key: 'backfilled', label: m('skill-schedule.plan-feishuDocs.c002'), hint: m('skill-schedule.plan-feishuDocs.c003') },
  { key: 'created', label: m('skill-schedule.plan-feishuDocs.c004'), hint: m('skill-schedule.plan-feishuDocs.c005') },
  { key: 'updated', label: m('skill-schedule.plan-feishuDocs.c006'), hint: m('skill-schedule.plan-feishuDocs.c007') },
  { key: 'timeSynced', label: m('skill-schedule.plan-feishuDocs.c008'), hint: m('skill-schedule.plan-feishuDocs.c009') },
  { key: 'deleted', label: m('skill-schedule.plan-feishuDocs.c010'), hint: m('skill-schedule.plan-feishuDocs.c011') },
  { key: 'pastSkipped', label: m('skill-schedule.plan-feishuDocs.c012'), hint: m('skill-schedule.plan-feishuDocs.c013') },
  { key: 'duplicates', label: m('skill-schedule.plan-feishuDocs.c014'), hint: m('skill-schedule.plan-feishuDocs.c015') },
  { key: 'failed', label: m('skill-schedule.plan-feishuDocs.c016'), hint: m('skill-schedule.plan-feishuDocs.c017') },
  ];
}

function eventRows(events: readonly PlanEvent[]): DataTableRow[] {
  return events.map((p) => ({
    time: m('skill-schedule.plan-feishuDocs.c018', { p0: String(p.time_start), p1: String(p.time_end) }),
    title: p.title,
    category: l1Of(p.category ?? ''),
    remote: p.feishu_event_id === null ? m('skill-schedule.plan-feishuDocs.c019') : m('skill-schedule.plan-feishuDocs.c020'),
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

/** 「飞书探测」整页：三档结论 ＋ 下一步 ＋ 本地这一天的账（**这一趟没写任何对象**）。
 *
 *  #896 · 「授权登录过」与进度条读 `report.authenticated`（布尔位），不读 `report.openId` 原值：
 *  回执不带 openId 原串（隐私），`handlers.ts` 重建时 `openId` 置 null 仅占形状，显示以布尔位为准。
 */
export function probePage(handle: ScheduleDb, date: string, report: TierReport): string {
  const local = localCounts(handle, date);
  const kpis: readonly KpiCardInput[] = [
    { label: m('skill-schedule.plan-feishuDocs.c021'), value: tierValueOf(report.tier), detail: plain(report.why) },
    { label: m('skill-schedule.plan-feishuDocs.c022'), value: String(local.total), unit: m('skill-schedule.plan-feishuDocs.c023'), detail: m('skill-schedule.plan-feishuDocs.c024', { p0: String(fmtDurShort(local.minutes)) }) },
    { label: m('skill-schedule.plan-feishuDocs.c025'), value: String(local.synced), unit: m('skill-schedule.plan-feishuDocs.c026'), detail: m('skill-schedule.plan-feishuDocs.c027') },
    {
      label: m('skill-schedule.plan-feishuDocs.c028'),
      value: '0',
      detail: m('skill-schedule.plan-feishuDocs.c029'),
      // 三档全通时给满，其余档按三门过了几门给（读数同源：探测结果那一份）。
      // #896 · 读 authenticated 布尔位，不读 openId 原值（回执不带原串，见 probe.ts 件头）。
      bar: { pct: Math.round(([report.cliPath === null ? 0 : 1, report.authenticated ? 1 : 0, report.calendar ? 1 : 0]
        .reduce((a, b) => a + b, 0) / 3) * 100) },
    },
  ];
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-feishuDocs.c030'),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-feishuDocs.c031'),
    subtitle: m('skill-schedule.plan-feishuDocs.c032', { p0: String(date) }),
  };
  const steps: readonly DataTableRow[] = [
    { step: m('skill-schedule.plan-feishuDocs.c033'), state: report.cliPath === null ? m('skill-schedule.plan-feishuDocs.c034') : m('skill-schedule.plan-feishuDocs.c035'), why: report.cliPath === null ? m('skill-schedule.plan-feishuDocs.c036') : m('skill-schedule.plan-feishuDocs.c037') },
    { step: m('skill-schedule.plan-feishuDocs.c038'), state: report.authenticated ? m('skill-schedule.plan-feishuDocs.c039') : m('skill-schedule.plan-feishuDocs.c040'), why: report.authenticated ? m('skill-schedule.plan-feishuDocs.c041') : m('skill-schedule.plan-feishuDocs.c042') },
    { step: m('skill-schedule.plan-feishuDocs.c043'), state: report.calendar ? m('skill-schedule.plan-feishuDocs.c044') : m('skill-schedule.plan-feishuDocs.c045'), why: report.calendar ? m('skill-schedule.plan-feishuDocs.c046') : m('skill-schedule.plan-feishuDocs.c047') },
  ];
  const { toc, body } = pageSections([
    { navText: m('skill-schedule.plan-feishuDocs.c048'), html: renderKpiGrid(kpis, { title: m('skill-schedule.plan-feishuDocs.c049') }) },
    { html: renderConclusionBar(m('skill-schedule.plan-feishuDocs.c050', {
      p0: String(tierCnOf(report.tier)),
      p1: String(plain(report.why)),
    })) },
    { navText: m('skill-schedule.plan-feishuDocs.c051'), html: renderSectionTitle(m('skill-schedule.plan-feishuDocs.c052'))
      + renderDataTable({
        columns: [
          { key: 'step', label: m('skill-schedule.plan-feishuDocs.c053') },
          { key: 'state', label: m('skill-schedule.plan-feishuDocs.c054') },
          { key: 'why', label: m('skill-schedule.plan-feishuDocs.c055') },
        ],
        rows: steps,
      }) },
    { html: renderFactStrip({
      items: [
        { label: m('skill-schedule.plan-feishuDocs.c056'), value: report.version === null ? m('skill-schedule.plan-feishuDocs.c057') : shortLarkVersion(report.version) },
        { label: m('skill-schedule.plan-feishuDocs.c058'), value: date },
        { label: m('skill-schedule.plan-feishuDocs.c059'), value: m('skill-schedule.plan-feishuDocs.c060', { p0: String(String(local.total)) }) },
        { label: m('skill-schedule.plan-feishuDocs.c061'), value: m('skill-schedule.plan-feishuDocs.c062') },
      ],
    }) },
    { navText: m('skill-schedule.plan-feishuDocs.c063'), html: renderSectionTitle(m('skill-schedule.plan-feishuDocs.c064'))
      + renderListRows({
        items: tierNextOf(report.tier).map((text) => ({ main: text })),
        emptyText: m('skill-schedule.plan-feishuDocs.c065'),
      }) },
    { navText: m('skill-schedule.plan-feishuDocs.c066'), html: renderSectionTitle(m('skill-schedule.plan-feishuDocs.c067'))
      + '<p class="sch-pl-note">' + m('skill-schedule.plan-feishuDocs.c133') + '</p>'
      + renderDataTable({
        columns: [
          { key: 'time', label: m('skill-schedule.plan-feishuDocs.c068') },
          { key: 'title', label: m('skill-schedule.plan-feishuDocs.c069') },
          { key: 'category', label: m('skill-schedule.plan-feishuDocs.c070') },
          { key: 'remote', label: m('skill-schedule.plan-feishuDocs.c071') },
        ],
        rows: eventRows(listPlanEvents(handle, date)),
        emptyText: m('skill-schedule.plan-feishuDocs.c072'),
      })
      + renderCaliberLine(m('skill-schedule.plan-feishuDocs.c073')) },
    { html: renderPreBlock({
      label: m('skill-schedule.plan-feishuDocs.c074'),
      command: m('skill-schedule.plan-feishuDocs.c075', { p0: String(date) }),
      actionId: 'ilife-sch-probe-copy-next',
      copyLabel: m('skill-schedule.plan-feishuDocs.c076'),
    }) },
    { navText: m('skill-schedule.plan-feishuDocs.c077'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-feishuDocs.c078'),
      dataActionId: 'ilife-sch-probe-copy-data',
      logActionId: 'ilife-sch-probe-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-feishuDocs.c079', {
          p0: String(date),
          p1: String(tierCnOf(report.tier)),
          p2: String(report.why),
          p3: String(String(local.total)),
          p4: String(String(local.synced)),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"sync","dryRun":true,"date":"' + date + '"}',
        source: m('skill-schedule.plan-feishuDocs.c080'),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
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
    ? m('skill-schedule.plan-feishuDocs.c081')
    : (moved === 0 ? m('skill-schedule.plan-feishuDocs.c082') : m('skill-schedule.plan-feishuDocs.c083', { p0: String(String(moved)) }));
  const parts = [
    m('skill-schedule.plan-feishuDocs.c084', { p0: String(String(c.backfilled ?? 0)) }),
    m('skill-schedule.plan-feishuDocs.c085', { p0: String(String(c.created ?? 0)) }),
    m('skill-schedule.plan-feishuDocs.c086', { p0: String(String(c.updated ?? 0)) }),
    m('skill-schedule.plan-feishuDocs.c087', { p0: String(String(c.timeSynced ?? 0)) }),
    m('skill-schedule.plan-feishuDocs.c088', { p0: String(String(c.deleted ?? 0)) }),
  ].join('，');
  const tail = (c.failed ?? 0) === 0
    ? m('skill-schedule.plan-feishuDocs.c089')
    : m('skill-schedule.plan-feishuDocs.c090', { p0: String(String(c.failed ?? 0)) });
  return head + parts + '。' + tail;
}

/** 「日程管家同步」整页：这一趟做了什么分格报出来，没成的逐条点名。 */
export function syncPage(handle: ScheduleDb, date: string, payload: SyncPayload): string {
  const events = listPlanEvents(handle, date);
  const failed = payload.counts.failed ?? 0;
  const labels = countLabels();
  const kpis: readonly KpiCardInput[] = labels.map((c) => ({
    label: c.label,
    value: String(payload.counts[c.key] ?? 0),
    unit: m('skill-schedule.plan-feishuDocs.c091'),
    detail: c.hint,
  }));
  // §4.7 · 计数串与「没成的」那一支先抽局部变量，链里只拼字面量＋变量。
  const countsText = labels.map((c) => m('skill-schedule.plan-feishuDocs.c092', {
    p0: String(c.label),
    p1: String(String(payload.counts[c.key] ?? 0)),
  })).join('，');
  const errorsNote = payload.errors.length === 0 ? '' : m('skill-schedule.plan-feishuDocs.c093', { p0: String(payload.errors.join('，')) });
  const { toc, body } = pageSections([
    { navText: m('skill-schedule.plan-feishuDocs.c094'), html: renderKpiGrid(kpis, { title: m('skill-schedule.plan-feishuDocs.c095') }) },
    { html: renderConclusionBar(syncConclusion(payload)) },
    { html: renderFactStrip({
      items: [
        { label: m('skill-schedule.plan-feishuDocs.c096'), value: date },
        { label: m('skill-schedule.plan-feishuDocs.c097'), value: remoteLabelOf(payload.remote) },
        { label: m('skill-schedule.plan-feishuDocs.c098'), value: m('skill-schedule.plan-feishuDocs.c099', { p0: String(String(events.length)) }) },
        { label: m('skill-schedule.plan-feishuDocs.c100'), value: m('skill-schedule.plan-feishuDocs.c101', { p0: String(String(failed)) }) },
      ],
    }) },
    { navText: m('skill-schedule.plan-feishuDocs.c102'), html: renderFeedbackBlock({
      title: m('skill-schedule.plan-feishuDocs.c103'),
      toast: failed === 0
        ? { icon: payload.remote === 'unavailable' ? 'warn' : 'ok', msg: plain(payload.message) }
        : { icon: 'danger', msg: plain(payload.message), lines: payload.errors.map(plain) },
      staticNotice: true,
    }) },
    { navText: payload.notes.length === 0 ? '' : m('skill-schedule.plan-feishuDocs.c104'), html: payload.notes.length === 0 ? '' : renderSectionTitle(m('skill-schedule.plan-feishuDocs.c105'))
      + renderListRows({ items: payload.notes.map((text) => ({ main: plain(text) })), emptyText: m('skill-schedule.plan-feishuDocs.c106') }) },
    { navText: payload.errors.length === 0 ? '' : m('skill-schedule.plan-feishuDocs.c107'), html: payload.errors.length === 0 ? '' : renderSectionTitle(m('skill-schedule.plan-feishuDocs.c108'))
      + renderListRows({ items: payload.errors.map((text) => ({ main: plain(text) })), emptyText: m('skill-schedule.plan-feishuDocs.c109') }) },
    { navText: m('skill-schedule.plan-feishuDocs.c110'), html: renderSectionTitle(m('skill-schedule.plan-feishuDocs.c111'))
      + renderCaliberLine(m('skill-schedule.plan-feishuDocs.c112'))
      + renderDataTable({
        columns: [
          { key: 'time', label: m('skill-schedule.plan-feishuDocs.c113') },
          { key: 'title', label: m('skill-schedule.plan-feishuDocs.c114') },
          { key: 'category', label: m('skill-schedule.plan-feishuDocs.c115') },
          { key: 'remote', label: m('skill-schedule.plan-feishuDocs.c116') },
        ],
        rows: eventRows(events),
        emptyText: m('skill-schedule.plan-feishuDocs.c117'),
      }) },
    { navText: m('skill-schedule.plan-feishuDocs.c118'), html: renderSectionTitle(m('skill-schedule.plan-feishuDocs.c119'))
      + renderListRows({
        items: [
          { main: m('skill-schedule.plan-feishuDocs.c120') },
          { main: m('skill-schedule.plan-feishuDocs.c121') },
        ],
        emptyText: m('skill-schedule.plan-feishuDocs.c122'),
      }) },
    { html: renderPreBlock({
      label: m('skill-schedule.plan-feishuDocs.c123'),
      command: m('skill-schedule.plan-feishuDocs.c124', { p0: String(date) }),
      actionId: 'ilife-sch-sync-copy-next',
      copyLabel: m('skill-schedule.plan-feishuDocs.c125'),
    }) },
    { navText: m('skill-schedule.plan-feishuDocs.c126'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-feishuDocs.c127'),
      dataActionId: 'ilife-sch-sync-copy-data',
      logActionId: 'ilife-sch-sync-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-feishuDocs.c128', {
          p0: String(date),
          p1: String(payload.message),
          p2: String(countsText),
          p3: String(errorsNote),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"sync","date":"' + date + '"}',
        source: m('skill-schedule.plan-feishuDocs.c129'),
        ok: payload.errors.length === 0,
      }),
    }) },
  ]);
  return assembleDocPage({
    head: {
      docTitle: m('skill-schedule.plan-feishuDocs.c130'),
      eyebrow: eyebrowOf(),
      title: m('skill-schedule.plan-feishuDocs.c131'),
      subtitle: m('skill-schedule.plan-feishuDocs.c132', { p0: String(date) }),
    },
    content: toc + body,
    extraCss: planPartsCss(),
  });
}
