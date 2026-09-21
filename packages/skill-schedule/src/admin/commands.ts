/** 辅助与管理的命令声明（**权威源**，一条：作息管家帮助）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 * 本键全程不开库（#203）：`lookupHelp` 只收 params，出口不传 db（见 `cli/cmd_read.ts`）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { lookupHelp } from './handlers.js';

export const ADMIN_COMMANDS = [
  { kind: 'read', key: 'schedule.help.lookup', shape: 'list', title: '作息管家帮助', wakeWord: '作息管家 HELP', run: (params) => lookupHelp(params), example: 'schedule-cmd-read schedule.help.lookup' },
] satisfies readonly CommandSpec[];
