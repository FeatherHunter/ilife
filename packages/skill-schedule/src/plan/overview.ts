// 日程与计划·24h 聚合视图与多日查询（#15／#16）。
//
// 分桶口径（照老实物 `schedule_db.py:697-746` 的 `_read_plan_dict`）：
//   每条活跃事件按 **time_start 的整点**落桶，同一小时内多条以 `+` 拼接；
//   空桶出力「未规划」；日期随附该日的 created_at／updated_at。
// **有意保留的损失**（老实物自己在输出里就点名了）：聚合视图丢 notes／飞书同步状态／ID——
// 想要全字段请走 `查日程`（`plan.today` 的 list 档），聚合视图只服务「一天 24 格长什么样」。
// 多日查询（#16）是这条视图的独门能力：一次给多个日期，逐日一段。
import { listPlanEvents, getPlanTimestamps } from '../fetch/index.js';
import type { ScheduleDb } from '../fetch/index.js';
import { hourLabel } from './iso.js';

export interface PlanHourRow { hour: number; label: string; text: string }
export interface PlanDayRow {
  date: string;
  hours: PlanHourRow[];
  /** 填了几格（0..24）——一眼看出这天有没有排过。 */
  plannedHours: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PlanOverviewPayload {
  items: PlanDayRow[];
  total: number;
  dates: string[];
  view: 'aggregate';
  note: string;
}

const NOTE = '这是 24h 聚合视图：同小时内的多条事件用 + 合并，丢 notes／飞书同步状态／ID；要看全字段请用「查日程」。';

export function buildPlanOverview(handle: ScheduleDb, dates: string[]): PlanOverviewPayload {
  const items = dates.map((date) => buildDay(handle, date));
  return { items, total: items.length, dates, view: 'aggregate', note: NOTE };
}

function buildDay(handle: ScheduleDb, date: string): PlanDayRow {
  const events = listPlanEvents(handle, date);
  const bucket: string[][] = Array.from({ length: 24 }, () => []);
  for (const e of events) {
    const h = Number(e.time_start.slice(0, 2));
    if (Number.isInteger(h) && h >= 0 && h <= 23) bucket[h].push(e.title.trim());
  }
  const hours: PlanHourRow[] = bucket.map((titles, h) => ({
    hour: h,
    label: hourLabel(h),
    text: titles.length ? titles.join('+') : '未规划',
  }));
  const ts = getPlanTimestamps(handle, date);
  return {
    date,
    hours,
    plannedHours: bucket.filter((t) => t.length > 0).length,
    createdAt: ts.createdAt,
    updatedAt: ts.updatedAt,
  };
}
