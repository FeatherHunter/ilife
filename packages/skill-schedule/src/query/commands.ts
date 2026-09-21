/** 查询与浏览的命令声明（**权威源**，四条：单日查／区间汇总／详情／查日程）。
 *
 * `schedule.plan.today` 住这里（它的唤醒词 #12／#15／#16 在 HELP 查询组）：键是不透明串，
 * 归属按 HELP 分组基本盘，不按命名空间。加一条命令＝只改这个文件＋它那个子功能文件。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewPlanToday, viewRecordDetail, viewRecordRange, viewRecordToday } from './handlers.js';

export const QUERY_COMMANDS = [
  { kind: 'read', key: 'schedule.record.today', shape: 'list', title: '今日作息', wakeWord: '查作息', run: viewRecordToday, example: 'schedule-cmd-read schedule.record.today' },
  { kind: 'read', key: 'schedule.record.range', shape: 'stat', title: '汇总作息', wakeWord: '汇总作息', run: viewRecordRange, example: 'schedule-cmd-read schedule.record.range --params \'{"start":"2026-09-01","end":"2026-09-01"}\'' },
  { kind: 'read', key: 'schedule.record.detail', shape: 'detail', title: '作息详情', wakeWord: '查作息详情', run: viewRecordDetail, example: 'schedule-cmd-read schedule.record.detail' },
  { kind: 'read', key: 'schedule.plan.today', shape: 'list', title: '查日程', wakeWord: '查日程', run: viewPlanToday, example: 'schedule-cmd-read schedule.plan.today' },
] satisfies readonly CommandSpec[];
