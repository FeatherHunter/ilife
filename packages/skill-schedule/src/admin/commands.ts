/** 辅助与管理的命令声明（**权威源**，一条：作息管家帮助）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 * 本键全程不开库（#203）：`lookupHelp` 只收 params，出口不传 db（见 `cli/cmd_read.ts`）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { lookupHelp } from './handlers.js';
import { m } from '../entries/index.js';

/** 一条辅助与管理命令的声明（按调用重建）。#1197：标题随语言取值，故整张表搬进函数体；
 *  `ADMIN_COMMANDS` 仍是模块加载期那一份 zh 快照（生成的 `cli/registry.ts` 只拿它做分派索引，
 *  与 `plan/commands.ts` 同型）。唤醒词与可执行示例是数据位（§4.9／ADR-0004「唤醒词按语言增补」）：
 *  唤醒词是路由键、示例含可运行的中文样例数据，译了就跑不通。 */
function adminCommands(): readonly CommandSpec[] {
  return [
    { kind: 'read', key: 'schedule.help.lookup', shape: 'list', title: m('skill-schedule.admin-commands.c001'), wakeWord: m('skill-schedule.admin-commands.c002'), run: (params) => lookupHelp(params), example: 'schedule-cmd-read schedule.help.lookup' },
  ];
}

export const ADMIN_COMMANDS = adminCommands();
