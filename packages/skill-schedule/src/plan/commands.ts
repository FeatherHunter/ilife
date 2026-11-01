/** 日程与计划的命令声明（**权威源**，一条：写计划，覆盖补／改／删／复盘／商量／同步）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动（Layer2 落定）。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { writePlan } from './handlers.js';
import { m } from '../entries/index.js';

/** 一条写计划命令的声明（按调用重建）。#1197：标题随语言取值，故整张表搬进函数体；
 *  `PLAN_COMMANDS` 仍是模块加载期那一份 zh 快照（生成的 `cli/registry.ts` 只拿它做分派索引，
 *  与 skill-bill 的 `RECORD_COMMANDS` 同型）。唤醒词与可执行示例是数据位（§4.9）：
 *  示例含可运行的中文样例数据，译了就跑不通。 */
function planCommands(): readonly CommandSpec[] {
  return [
    { kind: 'write', key: 'schedule.plan.write', title: m('skill-schedule.plan-commands.c001'), wakeWord: m('skill-schedule.plan-commands.c002'), run: writePlan, example: m('skill-schedule.plan-commands.c003') },
  ];
}

export const PLAN_COMMANDS = planCommands();
