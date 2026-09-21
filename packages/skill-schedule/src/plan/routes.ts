/** 日程与计划的路由声明（**权威源**，`schedule.plan.write` 的 15 条）。
 *
 * `order`＝今日 `WAKE_TABLE` 下标：归并保序，HELP 速查与 SKILL.md 逐字节不动。
 * 条目逐字照搬 `src/policy/wakewords.ts`（Layer2 退役它之前，两处由对账测试钉死相等）。
 */
import type { RouteEntry } from '../shared/commandSpec.js';

export const PLAN_ROUTES: readonly RouteEntry[] = [
  { phrase: '商量计划', key: 'schedule.plan.write', preset: { op: 'preview' }, order: 33 },
  { phrase: '一起规划', key: 'schedule.plan.write', preset: { op: 'preview' }, order: 34 },
  { phrase: '规划明天', key: 'schedule.plan.write', preset: { op: 'preview' }, order: 35 },
  { phrase: '规划一天', key: 'schedule.plan.write', preset: { op: 'preview' }, order: 36 },
  { phrase: '讨论计划', key: 'schedule.plan.write', preset: { op: 'preview' }, order: 37 },
  { phrase: '补计划', key: 'schedule.plan.write', preset: { op: 'ensure' }, needs: ['date', 'time_start', 'time_end', 'title'], order: 38 },
  { phrase: '改计划', key: 'schedule.plan.write', preset: { op: 'update' }, needs: ['id'], order: 39 },
  { phrase: '删计划', key: 'schedule.plan.write', preset: { op: 'deactivate' }, needs: ['id'], order: 40 },
  { phrase: '复盘今日', key: 'schedule.plan.write', preset: { op: 'review', granularity: 'day' }, order: 41 },
  { phrase: '复盘本周', key: 'schedule.plan.write', preset: { op: 'review', granularity: 'week' }, order: 42 },
  { phrase: '复盘本月', key: 'schedule.plan.write', preset: { op: 'review', granularity: 'month' }, order: 43 },
  { phrase: '复盘区间', key: 'schedule.plan.write', preset: { op: 'review', granularity: 'range' }, order: 44 },
  { phrase: '日程管家同步', key: 'schedule.plan.write', preset: { op: 'sync' }, order: 45 },
  { phrase: '飞书探测', key: 'schedule.plan.write', preset: { op: 'sync', dryRun: true }, order: 46 },
  { phrase: '复盘', key: 'schedule.plan.write', preset: { op: 'review' }, order: 47 },
];
