/** 查询与浏览的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 switch 四臂（行为零改动）：`fail()` 改抛同文案的类型错误
 * （出口按类映射到同一退出码），`note()` 改走返回的 `notes`（出口逐条打出，stderr 字节一致）。
 *
 * **#784 起这一域多出「出页」那一半**（照 #783 写域的先例）：单日查／详情各出一张真页
 * （`./queryDocs.ts` 装配，形状见 `src/shared/`），`data` 载荷与退出码口径一行不改。
 * **#785 再补三张**：区间汇总（`schedule.record.range` 的缺省档）、24h 概览与查多日计划
 * （`schedule.plan.today` 的 `view=aggregate` 档）、周视图（同 `schedule.record.range` 的
 * `view=week` 档）——同样是「载荷不动，只把 HTML 交回去」。
 * 页的落点由出口按 `#843` 的通式名算（`delivery.path` 给绝对路径），本件只把 HTML 交回去。
 */
import {
  ScheduleFetchError, SchedulePolicyError,
  getRecordById, getLastRecord, getStatus, listPlanEvents, getPlanEventsRange,
  listRecordsByDate, listRecordsRange, searchPlanEvent,
} from '../fetch/index.js';
import { normalizeDate, parsePlanView, resolveDateParam, resolveRangeParam } from '../policy/index.js';
import { buildPlanOverview } from '../plan/index.js';
import {
  buildPlanToday, buildRecordDetail, buildRecordRange, buildRecordToday,
} from '../render/index.js';
import {
  renderTodaySummaryPage, renderPlanOverviewPage, renderRangeSummaryPage, renderWeekViewPage, weekDatesOf,
  type StatusView,
} from './queryDocs.js';
import type { ScheduleDb } from '../fetch/db.js';
import type { ViewHandler } from '../shared/commandSpec.js';

function needInt(params: Record<string, unknown>, name: string): number {
  const v = params[name];
  if (!Number.isInteger(v) || (v as number) <= 0) {
    throw new SchedulePolicyError('POLICY_MISSING_SLOT', '缺参数 ' + name + '（须为正整数）');
  }
  return v as number;
}

/** 「作息库现状」那一块要的读数（本域几处共用这一种取法，别处不各查一遍）。 */
function statusOf(handle: ScheduleDb): StatusView {
  return { ...getStatus(handle), last: getLastRecord(handle) };
}

/** 「此刻」的当天分钟数——只在**查的就是今天**时给：页上那句「这一天还没过完」不该拿现在
 *  去衡量过去某一天（把 7 月 1 日说成「还没过完」是假的）。 */
function nowMinutesOf(date: string): number | undefined {
  const now = new Date();
  const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-'
    + String(now.getDate()).padStart(2, '0');
  return date === today ? now.getHours() * 60 + now.getMinutes() : undefined;
}

/** 单日查这一支（7 个唤醒词共用一枚 key：今天总结／今日作息／今日总结／今天作息／查作息时间轴／
 *  查作息状态／查作息）。路由表没给它们各自的预设 ⇒ 出口分不出是哪个词，故出一张页把这些诉求答全：
 *  f01 四个必现块 ＋ 24h 时间轴 ＋ 作息库现状。 */
export const viewRecordToday: ViewHandler = (params, handle: ScheduleDb) => {
  const notes: string[] = [];
  const date = resolveDateParam(params);
  const records = listRecordsByDate(handle, date);
  const st = getStatus(handle);
  if (st.records === 0) notes.push('库空：真实无记录（非故障）');
  const html = renderTodaySummaryPage(records, date, { status: statusOf(handle), nowMinutes: nowMinutesOf(date) });
  return { data: buildRecordToday(date, records), html, notes };
};

export const viewRecordRange: ViewHandler = (params, handle: ScheduleDb) => {
  // 「周视图」那一支（#785）：本键多出这一枚唤醒词，路由给 preset `{view:'week'}`——出口只按 key
  // 分派、分不出是哪个词来的，故走预设这一条既有通道（照 `24h 概览` 的先例）。窗口＝锚点那周的
  // 周一至周日（`weekDatesOf`，周口径与 policy 同源）；**空周照出页**：七行都在、行尾写「无记录」
  // 是这一张页冻在 #782 的形状（形状不随数据变），不是阻断态。
  if (params.view === 'week') {
    const days = weekDatesOf(resolveDateParam(params));
    const records = listRecordsRange(handle, days[0], days[6]);
    return { data: buildRecordRange(days[0], days[6], records), html: renderWeekViewPage(records, days) };
  }
  const { start, end } = resolveRangeParam(params);
  const records = listRecordsRange(handle, start, end);
  if (!records.length) {
    throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '区间无记录：' + start + '~' + end + '（缺失阻断，不返空统计）');
  }
  return { data: buildRecordRange(start, end, records), html: renderRangeSummaryPage(records, start, end) };
};

export const viewRecordDetail: ViewHandler = (params, handle: ScheduleDb) => {
  if (params.id !== undefined) {
    return { data: buildRecordDetail(getRecordById(handle, needInt(params, 'id'))), html: '' };
  }
  const date = resolveDateParam(params);
  const records = listRecordsByDate(handle, date);
  if (!records.length) throw new ScheduleFetchError('SCHEDULE_RECORD_NOT_FOUND', '当日无记录：' + date);
  return { data: buildRecordDetail(records[0]), html: '' };
};

export const viewPlanToday: ViewHandler = (params, handle: ScheduleDb) => {
  // #15／#16：24h 聚合视图（分桶 ＋ 多日）走 `view=aggregate`；#12 查日程走全字段 list。
  // #785 起这一支出**真页**（此前回落薄模板页，渲染器按 `{time,title,activity}` 取值、
  // 载荷却是 `{date,hours[],plannedHours}` ⇒ 一排空卡）：载荷一行不改，只把 HTML 交回去。
  if (parsePlanView(params) === 'aggregate') {
    const dates = Array.isArray(params.dates) && params.dates.length
      ? (params.dates as unknown[]).map((x) => normalizeDate(x, 'dates[]'))
      : [resolveDateParam(params)];
    const payload = buildPlanOverview(handle, dates);
    return { data: { ...payload }, html: renderPlanOverviewPage(payload) };
  }
  if (typeof params.title === 'string' && params.title.trim()) {
    const date = resolveDateParam(params);
    const hits = searchPlanEvent(
      handle, date, params.title.trim(),
      params.time_start as string | undefined, params.time_end as string | undefined,
    );
    return { data: buildPlanToday(date, hits), html: '' };
  }
  if (Array.isArray(params.dates) && params.dates.length) {
    const dates = (params.dates as unknown[]).map((x) => normalizeDate(x, 'dates[]'));
    const lo = [...dates].sort()[0];
    const hi = [...dates].sort()[dates.length - 1];
    const all = getPlanEventsRange(handle, lo, hi).filter((e) => dates.includes(e.date));
    return { data: { items: all.map((e) => buildPlanToday(e.date, [e]).items[0]), total: all.length, date: lo + '~' + hi }, html: '' };
  }
  const date = resolveDateParam(params);
  return { data: buildPlanToday(date, listPlanEvents(handle, date)), html: '' };
};
