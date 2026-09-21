/** 查询与浏览的路由声明（**权威源**，17 条：单日查 8／区间 3／详情 2／查日程 4）。
 *
 * `schedule.plan.today` 的 4 条住这里（唤醒词 #12／#15／#16 在 HELP 查询组）：路由跟键走，
 * 一键的路由只住一处。`order`＝今日 `WAKE_TABLE` 下标，归并保序。
 * 条目逐字照搬 `src/policy/wakewords.ts`（Layer2 退役它之前，两处由对账测试钉死相等）。
 */
import type { RouteEntry } from '../shared/commandSpec.js';

export const QUERY_ROUTES: readonly RouteEntry[] = [
  { phrase: '今天总结', key: 'schedule.record.today', order: 4 },
  { phrase: '今日作息', key: 'schedule.record.today', order: 5 },
  { phrase: '今日总结', key: 'schedule.record.today', order: 6 },
  { phrase: '今天作息', key: 'schedule.record.today', order: 7 },
  { phrase: '查作息时间轴', key: 'schedule.record.today', order: 8 },
  { phrase: '查作息状态', key: 'schedule.record.today', order: 9 },
  { phrase: '初始化数据库', key: 'schedule.record.today', order: 10 },
  { phrase: '查作息', key: 'schedule.record.today', order: 11 },
  { phrase: '汇总作息', key: 'schedule.record.range', needs: ['start', 'end'], order: 12 },
  { phrase: '查作息范围', key: 'schedule.record.range', needs: ['start', 'end'], order: 13 },
  { phrase: '查作息游标', key: 'schedule.record.range', needs: ['start', 'end'], order: 14 },
  { phrase: '查作息详情', key: 'schedule.record.detail', order: 15 },
  { phrase: '按ID查记录', key: 'schedule.record.detail', needs: ['id'], order: 16 },
  { phrase: '查多日计划', key: 'schedule.plan.today', preset: { view: 'aggregate' }, needs: ['dates'], order: 29 },
  { phrase: '24h 概览', key: 'schedule.plan.today', preset: { view: 'aggregate' }, order: 30 },
  { phrase: '查日程', key: 'schedule.plan.today', order: 31 },
  { phrase: '看日程', key: 'schedule.plan.today', order: 32 },
];
