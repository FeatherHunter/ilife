/** 分析与洞察的路由声明（**权威源**，`schedule.record.compare` 的 5 条）。
 *
 * `order`＝今日 `WAKE_TABLE` 下标：归并保序，HELP 速查与 SKILL.md 逐字节不动。
 * 条目逐字照搬 `src/policy/wakewords.ts`（Layer2 退役它之前，两处由对账测试钉死相等）。
 */
import type { RouteEntry } from '../shared/commandSpec.js';

export const ANALYZE_ROUTES: readonly RouteEntry[] = [
  { phrase: '对比两个月', key: 'schedule.record.compare', preset: { kind: 'months' }, order: 24 },
  { phrase: '月份对比', key: 'schedule.record.compare', preset: { kind: 'months' }, order: 25 },
  { phrase: '跨月对比', key: 'schedule.record.compare', preset: { kind: 'months' }, order: 26 },
  { phrase: '类别深挖', key: 'schedule.record.compare', preset: { kind: 'category' }, order: 27 },
  { phrase: '异常检测', key: 'schedule.record.compare', preset: { kind: 'anomaly' }, order: 28 },
];
