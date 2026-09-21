/** 查询与浏览的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 switch 四臂（行为零改动）：`fail()` 改抛同文案的类型错误
 * （出口按类映射到同一退出码），`note()` 改走返回的 `notes`（出口逐条打出，stderr 字节一致）。
 */
import {
  ScheduleFetchError, SchedulePolicyError,
  getRecordById, getStatus, listPlanEvents, getPlanEventsRange,
  listRecordsByDate, listRecordsRange, searchPlanEvent,
} from '../fetch/index.js';
import { normalizeDate, parsePlanView, resolveDateParam, resolveRangeParam } from '../policy/index.js';
import { buildPlanOverview } from '../plan/index.js';
import {
  buildPlanToday, buildRecordDetail, buildRecordRange, buildRecordToday,
} from '../render/index.js';
import type { ScheduleDb } from '../fetch/db.js';
import type { ViewHandler } from '../shared/commandSpec.js';

function needInt(params: Record<string, unknown>, name: string): number {
  const v = params[name];
  if (!Number.isInteger(v) || (v as number) <= 0) {
    throw new SchedulePolicyError('POLICY_MISSING_SLOT', '缺参数 ' + name + '（须为正整数）');
  }
  return v as number;
}

export const viewRecordToday: ViewHandler = (params, handle: ScheduleDb) => {
  const notes: string[] = [];
  const date = resolveDateParam(params);
  const records = listRecordsByDate(handle, date);
  const st = getStatus(handle);
  if (st.records === 0) notes.push('库空：真实无记录（非故障）');
  return { data: buildRecordToday(date, records), html: '', notes };
};

export const viewRecordRange: ViewHandler = (params, handle: ScheduleDb) => {
  const { start, end } = resolveRangeParam(params);
  const records = listRecordsRange(handle, start, end);
  if (!records.length) {
    throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '区间无记录：' + start + '~' + end + '（缺失阻断，不返空统计）');
  }
  return { data: buildRecordRange(start, end, records), html: '' };
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
  if (parsePlanView(params) === 'aggregate') {
    const dates = Array.isArray(params.dates) && params.dates.length
      ? (params.dates as unknown[]).map((x) => normalizeDate(x, 'dates[]'))
      : [resolveDateParam(params)];
    return { data: { ...buildPlanOverview(handle, dates) }, html: '' };
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
