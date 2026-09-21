/** 辅助与管理的路由声明（**权威源**，`schedule.help.lookup` 的 4 条）。
 *
 * `order`＝今日 `WAKE_TABLE` 下标：归并保序，HELP 速查与 SKILL.md 逐字节不动。
 * 条目逐字照搬 `src/policy/wakewords.ts`（Layer2 退役它之前，两处由对账测试钉死相等）。
 */
import type { RouteEntry } from '../shared/commandSpec.js';

export const ADMIN_ROUTES: readonly RouteEntry[] = [
  { phrase: '作息管家 HELP', key: 'schedule.help.lookup', order: 0 },
  { phrase: '作息管家帮助', key: 'schedule.help.lookup', order: 1 },
  { phrase: '作息管家能做什么', key: 'schedule.help.lookup', order: 2 },
  { phrase: '作息管家使用说明', key: 'schedule.help.lookup', order: 3 },
];
