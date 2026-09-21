/** 写入与同步的路由声明（**权威源**，`schedule.record.write` 的 7 条）。
 *
 * `order`＝今日 `WAKE_TABLE` 下标：归并保序，HELP 速查与 SKILL.md 逐字节不动。
 * 条目逐字照搬 `src/policy/wakewords.ts`（Layer2 退役它之前，两处由对账测试钉死相等）。
 */
import type { RouteEntry } from '../shared/commandSpec.js';

export const WRITE_ROUTES: readonly RouteEntry[] = [
  { phrase: '补一条作息', key: 'schedule.record.write', preset: { op: 'add' }, order: 17 },
  { phrase: '录作息', key: 'schedule.record.write', preset: { op: 'add' }, order: 18 },
  { phrase: '修正作息', key: 'schedule.record.write', preset: { op: 'amend' }, needs: ['id'], order: 19 },
  { phrase: '改作息', key: 'schedule.record.write', preset: { op: 'amend' }, needs: ['id'], order: 20 },
  { phrase: '这条记错了', key: 'schedule.record.write', preset: { op: 'amend' }, needs: ['id'], order: 21 },
  { phrase: '写作息摘要', key: 'schedule.record.write', preset: { op: 'summary' }, order: 22 },
  { phrase: '记作息', key: 'schedule.record.write', preset: { op: 'add' }, order: 23 },
];
