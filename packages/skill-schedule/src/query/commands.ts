/** 查询与浏览的命令声明（**权威源**，四条：单日查／区间汇总／详情／查日程）。
 *
 * `schedule.plan.today` 住这里（它的唤醒词 #12／#15／#16 在 HELP 查询组）：键是不透明串，
 * 归属按 HELP 分组基本盘，不按命名空间。加一条命令＝只改这个文件＋它那个子功能文件。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewPlanToday, viewRecordDetail, viewRecordRange, viewRecordToday } from './handlers.js';
import { m } from '../entries/index.js';

/** 查询与浏览的命令表（按调用重建）。#1197：标题随语言取值，故整张表搬进函数体；
 *  `QUERY_COMMANDS` 仍是模块加载期那一份 zh 快照（生成的 `cli/registry.ts` 只拿它做分派索引）。
 *  唤醒词与可执行示例是数据位（§4.9／ADR-0004）：唤醒词是路由键、示例是可直接跑的命令行。 */
function queryCommands(): readonly CommandSpec[] {
  return [
    { kind: 'read', key: 'schedule.record.today', shape: 'list', title: m('skill-schedule.query-commands.c001'), wakeWord: m('skill-schedule.query-commands.c002'), run: viewRecordToday, example: 'schedule-cmd-read schedule.record.today' },
    { kind: 'read', key: 'schedule.record.range', shape: 'stat', title: m('skill-schedule.query-commands.c003'), wakeWord: m('skill-schedule.query-commands.c004'), run: viewRecordRange, example: 'schedule-cmd-read schedule.record.range --params \'{"start":"2026-09-01","end":"2026-09-01"}\'' },
    { kind: 'read', key: 'schedule.record.detail', shape: 'detail', title: m('skill-schedule.query-commands.c005'), wakeWord: m('skill-schedule.query-commands.c006'), run: viewRecordDetail, example: 'schedule-cmd-read schedule.record.detail' },
    { kind: 'read', key: 'schedule.plan.today', shape: 'list', title: m('skill-schedule.query-commands.c007'), wakeWord: m('skill-schedule.query-commands.c008'), run: viewPlanToday, example: 'schedule-cmd-read schedule.plan.today' },
  ];
}

export const QUERY_COMMANDS = queryCommands();
