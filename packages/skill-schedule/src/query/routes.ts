/** 查询与浏览的路由声明（**权威源**，19 条：单日查 8／区间 3／详情 3／查日程 4／周视图 1）。
 *
 * `schedule.plan.today` 的 4 条住这里（唤醒词 #12／#15／#16 在 HELP 查询组）：路由跟键走，
 * 一键的路由只住一处。`order`＝今日 `WAKE_TABLE` 下标，归并保序。
 * 条目逐字照搬 `src/policy/wakewords.ts`（Layer2 退役它之前，两处由对账测试钉死相等）。
 *
 * #785 · 「周视图」这一条：老侧 34 词里唯一没有新仓命令的跨天视图（本图 Q1 裁决补上它）。
 * **键不新造**——落在同族的 `schedule.record.range` 上，用 preset 分档（照 `24h 概览` 那一对
 * 唤醒词的先例）：`view=week` 让处理函数出周视图那张页，缺省档仍是区间汇总。不新造 key 的理由：
 * 新 key 会牵动 `src/policy/wakewords.ts` 的 `ScheduleKey` 联合与快照门 `schedule/keys` 件，
 * 两处都不在本票写面（见票面「写面」段）。
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
  { phrase: '周视图', key: 'schedule.record.range', preset: { view: 'week' }, order: 48 },
  // #786 · 老词「按 ID 查记录」**带空格**：老 HELP 的 #23 就是带空格写的，而表里原有那条不带空格，
  //  `routeWakeword` 走 `text.includes(phrase)` ⇒ 用户按老 HELP 打字时一条也命不中。两条都留
  //  （最长匹配优先，带空格那条先命中），键与槽位一模一样。
  { phrase: '按 ID 查记录', key: 'schedule.record.detail', needs: ['id'], order: 49 },
];
